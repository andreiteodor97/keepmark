import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "valid email is required" }, { status: 400 });
  }

  try {
    await sendMagicLink(email.toLowerCase().trim());
  } catch (err) {
    console.error("Magic link error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send magic link" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
