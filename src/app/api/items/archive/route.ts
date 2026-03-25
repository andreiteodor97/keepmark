import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ids } = body as { ids?: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const result = await prisma.item.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { status: "archived" },
  });

  return NextResponse.json({ archived: result.count });
}
