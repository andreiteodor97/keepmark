import { NextResponse } from "next/server";
import { deleteSession, clearSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

const SESSION_COOKIE = "km_session";

export async function POST() {
  // Read the session token before clearing the cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await deleteSession(token);
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
