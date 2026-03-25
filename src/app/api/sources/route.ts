import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sources = await prisma.source.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, name, feedUrl, channel, handle, backfillMode, ...rest } = body as {
    type?: string;
    name?: string;
    feedUrl?: string;
    channel?: string;
    handle?: string;
    backfillMode?: string;
    [key: string]: unknown;
  };

  if (!type || typeof type !== "string") {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const sourceName = name || type;

  // Build config from extra fields
  const config: Record<string, unknown> = {};
  if (feedUrl) config.feedUrl = feedUrl;
  if (channel) config.channel = channel;
  if (handle) config.handle = handle;
  if (backfillMode) config.backfillMode = backfillMode;
  // Include any additional config fields
  for (const [key, value] of Object.entries(rest)) {
    config[key] = value;
  }

  // Check for existing source with same type and config
  const existingSources = await prisma.source.findMany({
    where: { userId: user.id, type },
  });

  // Look for a duplicate based on key config fields
  const existingSource = existingSources.find((s) => {
    const sConfig = s.config as Record<string, unknown>;
    if (feedUrl && sConfig.feedUrl === feedUrl) return true;
    if (channel && sConfig.channel === channel) return true;
    if (handle && sConfig.handle === handle) return true;
    return false;
  });

  if (existingSource) {
    return NextResponse.json({ source: existingSource, existing: true });
  }

  const source = await prisma.source.create({
    data: {
      userId: user.id,
      type,
      name: sourceName,
      config: config as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ source, existing: false }, { status: 201 });
}
