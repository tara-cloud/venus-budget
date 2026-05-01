import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface CsvRow {
  date: string;
  description: string;
  amount: string;
  type?: string;
  categoryId?: string;
  accountId: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows }: { rows: CsvRow[] } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const data = rows.map((r) => ({
    userId: session.user.id,
    accountId: r.accountId,
    categoryId: r.categoryId ?? null,
    amount: Math.abs(parseFloat(r.amount)),
    type: r.type ?? (parseFloat(r.amount) < 0 ? "expense" : "income"),
    description: r.description,
    date: new Date(r.date),
    source: "csv" as const,
  }));

  const result = await prisma.transaction.createMany({ data, skipDuplicates: false });
  return NextResponse.json({ created: result.count });
}
