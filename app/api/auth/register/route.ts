import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true },
  });

  // Create default categories for the new user
  await prisma.category.createMany({
    data: [
      { userId: user.id, name: "Salary", color: "#22c55e", icon: "💼", type: "income" },
      { userId: user.id, name: "Freelance", color: "#3b82f6", icon: "💻", type: "income" },
      { userId: user.id, name: "Investments", color: "#8b5cf6", icon: "📈", type: "income" },
      { userId: user.id, name: "Food & Dining", color: "#f97316", icon: "🍽️", type: "expense" },
      { userId: user.id, name: "Transport", color: "#0ea5e9", icon: "🚗", type: "expense" },
      { userId: user.id, name: "Shopping", color: "#ec4899", icon: "🛍️", type: "expense" },
      { userId: user.id, name: "Bills & Utilities", color: "#ef4444", icon: "⚡", type: "expense" },
      { userId: user.id, name: "Healthcare", color: "#14b8a6", icon: "🏥", type: "expense" },
      { userId: user.id, name: "Entertainment", color: "#f59e0b", icon: "🎬", type: "expense" },
      { userId: user.id, name: "Other", color: "#6b7280", icon: "📌", type: "expense" },
    ],
  });

  return NextResponse.json(user, { status: 201 });
}
