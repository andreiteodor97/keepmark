import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractContent } from "@/lib/extract";
import { checkQuota, incrementLinkCount } from "@/lib/sync";
import { hashUrl, normalizeUrl, generateId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { url, source } = body as { url?: string; source?: string };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL scheme and block internal/private addresses
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "only http and https URLs are supported" }, { status: 400 });
  }
  const hostname = parsedUrl.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168.") ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    return NextResponse.json({ error: "internal URLs are not allowed" }, { status: 400 });
  }

  const quota = await checkQuota(user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "quota_exceeded", message: "You have reached your link limit for this month", quota },
      { status: 429 },
    );
  }

  const normalizedUrl = normalizeUrl(url);
  const urlHash = hashUrl(normalizedUrl);

  // Check for existing item
  const existing = await prisma.item.findUnique({
    where: { userId_urlHash: { userId: user.id, urlHash } },
  });

  if (existing) {
    await prisma.item.update({
      where: { id: existing.id },
      data: {
        timesAdded: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      id: existing.id,
      url: existing.url,
      extracted: existing.contentAvailable,
      background: false,
      existing: true,
    });
  }

  // Create new item
  const id = generateId();
  const item = await prisma.item.create({
    data: {
      id,
      userId: user.id,
      url: normalizedUrl,
      urlHash,
      status: "stashed",
      lastSeenAt: new Date(),
    },
  });

  // Extract content
  let extracted = false;
  try {
    const result = await extractContent(normalizedUrl);
    await prisma.item.update({
      where: { id: item.id },
      data: {
        title: result.title,
        favicon: result.favicon,
        contentMarkdown: result.markdown,
        contentSource: result.contentSource ?? source ?? null,
        contentSize: result.contentSize ?? null,
        contentExtractError: result.error ?? null,
        contentAvailable: !result.error,
        contentExtractedAt: new Date(),
      },
    });
    extracted = !result.error;
  } catch (err) {
    await prisma.item.update({
      where: { id: item.id },
      data: {
        contentExtractError: err instanceof Error ? err.message : "Unknown extraction error",
        contentExtractedAt: new Date(),
      },
    });
  }

  // Increment link count
  await incrementLinkCount(user.id);

  return NextResponse.json({
    ok: true,
    id: item.id,
    url: normalizedUrl,
    extracted,
    background: false,
  });
}
