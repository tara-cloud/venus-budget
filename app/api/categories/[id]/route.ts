import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const cat = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle restore (un-delete)
  if (body.restore === true) {
    const restored = await prisma.category.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json(restored);
  }

  // Block editing soft-deleted categories
  if (cat.deletedAt !== null) {
    return NextResponse.json({ error: "Cannot edit a deleted category. Restore it first." }, { status: 400 });
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(body.name  !== undefined && { name:  body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.icon  !== undefined && { icon:  body.icon }),
      ...(body.group !== undefined && { group: body.group?.trim() || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await prisma.category.findFirst({ where: { id, userId: session.user.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — set deletedAt timestamp
  const deleted = await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json(deleted);
}
