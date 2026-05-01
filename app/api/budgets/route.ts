import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()));

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
    include: { category: true },
  });

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const spendByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId: session.user.id, type: "expense",
      date: { gte: startDate, lte: endDate },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  });

  const spendMap = Object.fromEntries(
    spendByCategory.map((s) => [s.categoryId, Number(s._sum.amount ?? 0)])
  );

  return NextResponse.json(budgets.map((b) => ({
    ...b, amount: Number(b.amount), spent: spendMap[b.categoryId] ?? 0,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── Bulk copy: one source month → multiple target months ─────────────────
  if (body.action === "copyFrom") {
    const { fromMonth, fromYear, targets, overwrite } = body;
    // targets: Array<{ month: number; year: number }>
    if (!fromMonth || !fromYear || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "Missing required fields for copy" }, { status: 400 });
    }

    const sourceBudgets = await prisma.budget.findMany({
      where: { userId: session.user.id, month: fromMonth, year: fromYear },
      include: { category: { select: { deletedAt: true } } },
    });

    const validSources = sourceBudgets.filter((b) => !b.category.deletedAt);
    if (validSources.length === 0) {
      return NextResponse.json({ copied: 0, skipped: 0, message: "No active budgets found in source month" });
    }

    let totalCopied = 0;
    let totalSkipped = 0;

    for (const target of targets) {
      const { month: toMonth, year: toYear } = target;
      for (const src of validSources) {
        if (overwrite) {
          await prisma.budget.upsert({
            where: { userId_categoryId_month_year: { userId: session.user.id, categoryId: src.categoryId, month: toMonth, year: toYear } },
            update: { amount: src.amount },
            create: { userId: session.user.id, categoryId: src.categoryId, month: toMonth, year: toYear, amount: src.amount },
          });
          totalCopied++;
        } else {
          const existing = await prisma.budget.findUnique({
            where: { userId_categoryId_month_year: { userId: session.user.id, categoryId: src.categoryId, month: toMonth, year: toYear } },
          });
          if (existing) { totalSkipped++; continue; }
          await prisma.budget.create({
            data: { userId: session.user.id, categoryId: src.categoryId, month: toMonth, year: toYear, amount: src.amount },
          });
          totalCopied++;
        }
      }
    }

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const targetLabels = targets.map((t: { month: number; year: number }) => `${monthNames[t.month - 1]} ${t.year}`).join(", ");
    return NextResponse.json({
      copied: totalCopied,
      skipped: totalSkipped,
      message: `Copied ${validSources.length} budget(s) to ${targets.length} month(s) (${targetLabels})${totalSkipped > 0 ? `, skipped ${totalSkipped} existing` : ""}`,
    });
  }

  // ── Single budget upsert ────────────────────────────────────────────────
  const { categoryId, month, year, amount } = body;
  if (!categoryId || !month || !year || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month_year: { userId: session.user.id, categoryId, month, year } },
    update: { amount },
    create: { userId: session.user.id, categoryId, month, year, amount },
    include: { category: true },
  });

  return NextResponse.json({ ...budget, amount: Number(budget.amount) }, { status: 201 });
}
