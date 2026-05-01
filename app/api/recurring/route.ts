import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fireRecurringRules } from "@/lib/recurring";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    include: { account: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { accountId, categoryId, amount, type, description, frequency, dayOfMonth, startDate, endDate } = body;

  if (!accountId || !amount || !type || !description || !frequency || !startDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId: session.user.id,
      accountId,
      categoryId: categoryId ?? null,
      amount,
      type,
      description,
      frequency,
      dayOfMonth: dayOfMonth ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { account: true, category: true },
  });
  return NextResponse.json(rule, { status: 201 });
}

export async function PUT() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await fireRecurringRules(session.user.id);
  return NextResponse.json({ fired: count });
}
