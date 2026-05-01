import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ group: "asc" }, { type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, color, icon, group } = await req.json();
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      userId: session.user.id,
      name,
      type,
      color: color ?? "#6366f1",
      icon: icon ?? null,
      group: group?.trim() || null,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
