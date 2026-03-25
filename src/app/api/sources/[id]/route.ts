import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await prisma.source.findFirst({
    where: { id, userId: user.id },
  });

  if (!source) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.source.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
