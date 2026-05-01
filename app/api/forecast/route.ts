import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Simple linear regression slope for forecasting
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function projectValue(values: number[], monthsAhead: number): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const s = slope(values);
  return Math.max(0, avg + s * monthsAhead);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const targetMonth = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 2));
  const targetYear  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));

  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear  = now.getFullYear();

  // How many months ahead is the target?
  const monthsAhead = (targetYear - nowYear) * 12 + (targetMonth - nowMonth);

  // Get last 12 months of data
  const historyStart = new Date(nowYear, nowMonth - 13, 1);
  const historyEnd   = new Date(nowYear, nowMonth, 0, 23, 59, 59);

  // ── 1. Monthly totals (income + expense) ─────────────────────────────────
  const monthlyTotals = await prisma.$queryRaw<{
    month: number; year: number; type: string; total: number
  }[]>`
    SELECT
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year,
      type,
      SUM(amount)::float AS total
    FROM "Transaction"
    WHERE "userId" = ${session.user.id}
      AND date >= ${historyStart} AND date <= ${historyEnd}
      AND type IN ('income','expense')
    GROUP BY year, month, type
    ORDER BY year, month
  `;

  // Build sorted month list
  const monthSet = new Map<string, { income: number; expense: number }>();
  for (const r of monthlyTotals) {
    const key = `${r.year}-${String(r.month).padStart(2,'0')}`;
    if (!monthSet.has(key)) monthSet.set(key, { income: 0, expense: 0 });
    if (r.type === 'income')  monthSet.get(key)!.income  = r.total;
    if (r.type === 'expense') monthSet.get(key)!.expense = r.total;
  }
  const sortedMonths = [...monthSet.entries()].sort(([a],[b]) => a.localeCompare(b));
  const incomeHistory  = sortedMonths.map(([,v]) => v.income);
  const expenseHistory = sortedMonths.map(([,v]) => v.expense);

  const forecastIncome  = projectValue(incomeHistory,  Math.max(1, monthsAhead));
  const forecastExpense = projectValue(expenseHistory, Math.max(1, monthsAhead));
  const forecastNet     = forecastIncome - forecastExpense;

  // ── 2. Per-account transaction totals ────────────────────────────────────
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, type: true, balance: true, currency: true },
  });

  // Compute current balance (opening + all income - all expense)
  const allAccTotals = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { userId: session.user.id, type: { in: ["income","expense"] } },
    _sum: { amount: true },
  });
  const accMap: Record<string, { income: number; expense: number }> = {};
  for (const t of allAccTotals) {
    if (!accMap[t.accountId]) accMap[t.accountId] = { income: 0, expense: 0 };
    if (t.type === 'income')  accMap[t.accountId].income  += Number(t._sum.amount ?? 0);
    if (t.type === 'expense') accMap[t.accountId].expense += Number(t._sum.amount ?? 0);
  }

  // Per-account monthly history for projection
  const accMonthly = await prisma.$queryRaw<{
    accountId: string; month: number; year: number; type: string; total: number
  }[]>`
    SELECT
      "accountId",
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year,
      type,
      SUM(amount)::float AS total
    FROM "Transaction"
    WHERE "userId" = ${session.user.id}
      AND date >= ${historyStart} AND date <= ${historyEnd}
      AND type IN ('income','expense')
    GROUP BY "accountId", year, month, type
    ORDER BY "accountId", year, month
  `;

  const accHistMap: Record<string, { income: number[]; expense: number[] }> = {};
  for (const r of accMonthly) {
    if (!accHistMap[r.accountId]) accHistMap[r.accountId] = { income: [], expense: [] };
    if (r.type === 'income')  accHistMap[r.accountId].income.push(r.total);
    if (r.type === 'expense') accHistMap[r.accountId].expense.push(r.total);
  }

  const accountForecasts = accounts.map((a) => {
    const hist = accHistMap[a.id] ?? { income: [], expense: [] };
    const tot  = accMap[a.id]    ?? { income: 0, expense: 0 };
    const currentBalance = Number(a.balance) + tot.income - tot.expense;
    const projIncome  = projectValue(hist.income,  Math.max(1, monthsAhead));
    const projExpense = projectValue(hist.expense, Math.max(1, monthsAhead));
    return {
      id:      a.id,
      name:    a.name,
      type:    a.type,
      currency: a.currency,
      currentBalance,
      forecastBalance: currentBalance + projIncome - projExpense,
      forecastIncome:  projIncome,
      forecastExpense: projExpense,
    };
  });

  // ── 3. Per-category expense forecast ─────────────────────────────────────
  const categories = await prisma.category.findMany({
    where: { userId: session.user.id, type: "expense", deletedAt: null },
  });

  const catMonthly = await prisma.$queryRaw<{
    categoryId: string; month: number; year: number; total: number
  }[]>`
    SELECT
      "categoryId",
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year,
      SUM(amount)::float AS total
    FROM "Transaction"
    WHERE "userId" = ${session.user.id}
      AND type = 'expense'
      AND "categoryId" IS NOT NULL
      AND date >= ${historyStart} AND date <= ${historyEnd}
    GROUP BY "categoryId", year, month
    ORDER BY "categoryId", year, month
  `;

  const catHistMap: Record<string, number[]> = {};
  for (const r of catMonthly) {
    if (!catHistMap[r.categoryId]) catHistMap[r.categoryId] = [];
    catHistMap[r.categoryId].push(r.total);
  }

  const categoryForecasts = categories
    .map((cat) => {
      const hist = catHistMap[cat.id] ?? [];
      if (hist.length === 0) return null;
      return {
        id:       cat.id,
        name:     cat.name,
        color:    cat.color,
        icon:     cat.icon,
        group:    cat.group,
        forecast: projectValue(hist, Math.max(1, monthsAhead)),
        avgActual: hist.reduce((s,v)=>s+v,0) / hist.length,
      };
    })
    .filter(Boolean)
    .sort((a,b) => b!.forecast - a!.forecast) as {
      id:string;name:string;color:string;icon?:string|null;group?:string|null;forecast:number;avgActual:number
    }[];

  // ── 4. Monthly trend for chart ─────────────────────────────────────────
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const trendPoints = sortedMonths.map(([key, v], i) => {
    const [y, m] = key.split('-').map(Number);
    return {
      label: `${MONTH_NAMES[m-1]} '${String(y).slice(2)}`,
      income: v.income, expense: v.expense, net: v.income - v.expense,
    };
  });
  // Add forecast point
  if (monthsAhead > 0) {
    trendPoints.push({
      label: `${MONTH_NAMES[targetMonth-1]} '${String(targetYear).slice(2)} (F)`,
      income: forecastIncome, expense: forecastExpense, net: forecastNet,
    });
  }

  return NextResponse.json({
    targetMonth, targetYear, monthsAhead,
    summary: { forecastIncome, forecastExpense, forecastNet },
    accounts: accountForecasts,
    categories: categoryForecasts,
    trend: trendPoints,
  });
}
