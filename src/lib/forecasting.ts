export interface ForecastPoint {
  month: number;
  year: number;
  actual?: number;
  forecast?: number;
}

export interface CategoryForecast {
  categoryId: string;
  categoryName: string;
  color: string;
  points: ForecastPoint[];
}

interface MonthlyTotal {
  month: number;
  year: number;
  total: number;
}

function weightedAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const n = values.length;
  const sum = (n * (n + 1)) / 2;
  return values.reduce((acc, v, i) => acc + v * (i + 1), 0) / sum;
}

export function buildForecast(
  monthlyTotals: MonthlyTotal[],
  windowSize = 6,
  projectMonths = 3
): ForecastPoint[] {
  const sorted = [...monthlyTotals].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );

  const points: ForecastPoint[] = sorted.map((m) => ({
    month: m.month,
    year: m.year,
    actual: m.total,
  }));

  if (sorted.length === 0) return points;

  // Use last `windowSize` months to project future
  const window = sorted.slice(-windowSize).map((m) => m.total);
  const avg = weightedAverage(window);

  const last = sorted[sorted.length - 1];
  let m = last.month;
  let y = last.year;

  for (let i = 0; i < projectMonths; i++) {
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    points.push({ month: m, year: y, forecast: avg });
  }

  return points;
}

export function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}
