import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink, createSession, setSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const userId = await verifyMagicLink(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 401 });
  }

  const sessionToken = await createSession(userId);
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
