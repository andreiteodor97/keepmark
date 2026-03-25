import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    email: user.email,
    plan: user.plan,
    linkLimit: user.linkLimit,
    linkCount: user.linkCountLifetime,
    linkCountMonth: user.linkCountMonth,
    linkCountLifetime: user.linkCountLifetime,
  });
}
