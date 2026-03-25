import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseRelativeTime } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");

  const since = sinceRaw ? parseRelativeTime(sinceRaw) ?? new Date(sinceRaw) : new Date(0);
  const until = untilRaw ? parseRelativeTime(untilRaw) ?? new Date(untilRaw) : new Date();

  const items = await prisma.item.groupBy({
    by: ["status"],
    where: {
      userId: user.id,
      createdAt: { gte: since, lte: until },
    },
    _count: { id: true },
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of items) {
    byStatus[row.status] = row._count.id;
    total += row._count.id;
  }

  return NextResponse.json({
    total,
    byStatus: {
      stashed: byStatus["stashed"] ?? 0,
      flagged: byStatus["flagged"] ?? 0,
      archived: byStatus["archived"] ?? 0,
    },
    range: {
      since: since.toISOString(),
      until: until.toISOString(),
      count: total,
    },
  });
}
