import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * POST: Verify site password.
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.slug || !body.password) {
    return NextResponse.json(
      { error: "missing_fields", message: "slug and password are required" },
      { status: 400 },
    );
  }

  const site = await prisma.site.findUnique({ where: { slug: body.slug } });
  if (!site || site.status === "deleted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!site.password) {
    return NextResponse.json(
      { error: "no_password", message: "This site does not have a password set" },
      { status: 400 },
    );
  }

  const isValid = await bcrypt.compare(body.password, site.password);
  if (!isValid) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  // Create signed cookie value
  const cookieValue = createHash("sha256")
    .update(site.password + body.slug)
    .digest("hex");

  const cookieName = `km_site_auth_${body.slug}`;
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  const response = NextResponse.json({ ok: true });

  response.cookies.set(cookieName, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return response;
}
