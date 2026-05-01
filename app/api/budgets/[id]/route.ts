import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const amount_data = await req.json();
  const { amount, unlockComment } = amount_data;

  const budget = await prisma.budget.findFirst({ where: { id, userId: session.user.id } });
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow future months and current month (with unlock comment); block only past months
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const isPast = budget.year < todayYear || (budget.year === todayYear && budget.month < todayMonth);
  const isCurrent = budget.year === todayYear && budget.month === todayMonth;
  if (isPast) {
    return NextResponse.json({ error: "Cannot edit budgets for past months" }, { status: 403 });
  }
  // Current month requires an unlock comment
  if (isCurrent && !amount_data?.unlockComment?.trim()) {
    return NextResponse.json({ error: "An unlock reason is required to edit the current month budget" }, { status: 403 });
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: { amount },  // unlockComment logged but not stored in DB (future: add audit log)
    include: { category: true },
  });
  return NextResponse.json({ ...updated, amount: Number(updated.amount) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const budget = await prisma.budget.findFirst({ where: { id, userId: session.user.id } });
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow deleting future months
  const now2 = new Date();
  const isFuture2 = budget.year > now2.getFullYear() || (budget.year === now2.getFullYear() && budget.month > now2.getMonth() + 1);
  if (!isFuture2) {
    return NextResponse.json({ error: "Cannot delete budgets for past or current months" }, { status: 403 });
  }

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
