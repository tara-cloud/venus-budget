import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  // Compute real-time balance = opening balance + sum(income) - sum(expense) from transactions
  const transactionTotals = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: {
      userId: session.user.id,
      accountId: { in: accounts.map((a) => a.id) },
      type: { in: ["income", "expense"] },
    },
    _sum: { amount: true },
  });

  // Build a map: accountId -> { income, expense }
  const totalsMap: Record<string, { income: number; expense: number }> = {};
  for (const t of transactionTotals) {
    if (!totalsMap[t.accountId]) totalsMap[t.accountId] = { income: 0, expense: 0 };
    if (t.type === "income")  totalsMap[t.accountId].income  += Number(t._sum.amount ?? 0);
    if (t.type === "expense") totalsMap[t.accountId].expense += Number(t._sum.amount ?? 0);
  }

  const result = accounts.map((a) => {
    const totals    = totalsMap[a.id] ?? { income: 0, expense: 0 };
    const openingBalance = Number(a.balance);
    const computedBalance = openingBalance + totals.income - totals.expense;
    return {
      ...a,
      balance:         computedBalance,
      openingBalance,
      totalIncome:     totals.income,
      totalExpenses:   totals.expense,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, balance, currency } = await req.json();
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      userId: session.user.id,
      name,
      type,
      balance: balance ?? 0,  // stored as opening balance
      currency: currency ?? "INR",
    },
  });
  return NextResponse.json(account, { status: 201 });
}
