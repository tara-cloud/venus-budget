import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));
  // cfRange: how many months back for Cash Flow chart (1, 3, 6, 12)
  const cfRange = parseInt(searchParams.get("cfRange") ?? "12");

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const [
    accounts,
    accountTxTotals,
    income,
    expenses,
    categoryBreakdown,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, type: true, balance: true, currency: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId: session.user.id, type: { in: ["income","expense"] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, type: "income", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, type: "expense", date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: session.user.id, type: "expense", date: { gte: startDate, lte: endDate }, categoryId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
  ]);

  // Compute per-account balance
  const accTotalsMap: Record<string, { income: number; expense: number }> = {};
  for (const t of accountTxTotals) {
    if (!accTotalsMap[t.accountId]) accTotalsMap[t.accountId] = { income: 0, expense: 0 };
    if (t.type === "income")  accTotalsMap[t.accountId].income  += Number(t._sum.amount ?? 0);
    if (t.type === "expense") accTotalsMap[t.accountId].expense += Number(t._sum.amount ?? 0);
  }
  const accountsWithBalance = accounts.map((a) => {
    const tot = accTotalsMap[a.id] ?? { income: 0, expense: 0 };
    const openingBalance  = Number(a.balance);
    const computedBalance = openingBalance + tot.income - tot.expense;
    return { ...a, balance: computedBalance, openingBalance, totalIncome: tot.income, totalExpenses: tot.expense };
  });

  // Resolve category names
  const catIds = categoryBreakdown.map((c) => c.categoryId).filter(Boolean) as string[];
  const cats   = catIds.length ? await prisma.category.findMany({ where: { id: { in: catIds } } }) : [];
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));
  const breakdown = categoryBreakdown.map((c) => ({
    categoryId: c.categoryId,
    name:  catMap[c.categoryId!]?.name  ?? "Unknown",
    color: catMap[c.categoryId!]?.color ?? "#6b7280",
    group: catMap[c.categoryId!]?.group ?? null,
    amount: Number(c._sum.amount ?? 0),
  }));

  // Group-level spending
  const groupSpend: Record<string, { group: string; amount: number; color: string }> = {};
  breakdown.forEach((b) => {
    const grp = b.group ?? "Ungrouped";
    if (!groupSpend[grp]) groupSpend[grp] = { group: grp, amount: 0, color: b.color };
    groupSpend[grp].amount += b.amount;
  });
  const groupBreakdown = Object.values(groupSpend).sort((a, b) => b.amount - a.amount);

  const totalIncome   = Number(income._sum.amount   ?? 0);
  const totalExpenses = Number(expenses._sum.amount  ?? 0);
  const totalBalance  = accountsWithBalance.reduce((s, a) => s + a.balance, 0);
  const accountsByType = {
    bank:   accountsWithBalance.filter((a) => a.type === "bank"),
    cash:   accountsWithBalance.filter((a) => a.type === "cash"),
    credit: accountsWithBalance.filter((a) => a.type === "credit"),
  };

  // Cash Flow trend — daily for cfRange <= 3, monthly otherwise
  const trendStart = new Date(year, month - cfRange, 1);
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let trend: { label: string; Income: number; Expenses: number; Net: number }[] = [];

  if (cfRange <= 3) {
    // Daily data
    const dailyRows = await prisma.$queryRaw<{ day: string; type: string; total: number }[]>`
      SELECT
        TO_CHAR(date, 'YYYY-MM-DD') AS day,
        type,
        SUM(amount)::float AS total
      FROM "Transaction"
      WHERE "userId" = ${session.user.id}
        AND date >= ${trendStart}
        AND date <= ${endDate}
        AND type IN ('income','expense')
      GROUP BY day, type
      ORDER BY day
    `;
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (const r of dailyRows) {
      if (!dayMap.has(r.day)) dayMap.set(r.day, { income: 0, expense: 0 });
      if (r.type === "income")  dayMap.get(r.day)!.income  = r.total;
      if (r.type === "expense") dayMap.get(r.day)!.expense = r.total;
    }
    trend = [...dayMap.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([day, v]) => {
      const d = new Date(day);
      return {
        label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
        Income: v.income, Expenses: v.expense, Net: v.income - v.expense,
      };
    });
  } else {
    // Monthly data
    const monthlyTrend = await prisma.$queryRaw<{ month: number; year: number; income: number; expenses: number }[]>`
      SELECT
        EXTRACT(MONTH FROM date)::int AS month,
        EXTRACT(YEAR FROM date)::int AS year,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END)::float AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)::float AS expenses
      FROM "Transaction"
      WHERE "userId" = ${session.user.id}
        AND date >= ${trendStart}
        AND date <= ${endDate}
      GROUP BY year, month
      ORDER BY year, month
    `;
    trend = monthlyTrend.map((t) => ({
      label: `${MONTH_NAMES[t.month - 1]} '${String(t.year).slice(2)}`,
      Income: t.income, Expenses: t.expenses, Net: t.income - t.expenses,
    }));
  }

  return NextResponse.json({
    month, year,
    totalBalance,
    accounts: accountsWithBalance,
    accountsByType,
    totalIncome, totalExpenses,
    netSavings: totalIncome - totalExpenses,
    breakdown, groupBreakdown, trend,
  });
}
