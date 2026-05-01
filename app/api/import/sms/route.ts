import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseSms } from "@/lib/sms-parser";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "SMS text is required" }, { status: 400 });
  }

  const result = parseSms(text.trim());
  if (!result) {
    return NextResponse.json({ error: "Could not parse SMS — format not recognised" }, { status: 422 });
  }

  return NextResponse.json(result);
}
