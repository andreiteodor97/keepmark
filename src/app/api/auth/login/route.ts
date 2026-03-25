import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  await sendMagicLink(email.toLowerCase().trim());

  return NextResponse.json({ ok: true });
}
