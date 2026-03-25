import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { incrementSiteCount } from "@/lib/site-quotas";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

/**
 * POST: Duplicate site to new slug.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = await prisma.site.findUnique({ where: { slug } });
  if (!site || site.status === "deleted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Owner check
  if (!site.userId || site.userId !== user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get current live version with files
  const currentVersion = await prisma.siteVersion.findFirst({
    where: { siteId: site.id, isLive: true },
    orderBy: { versionNumber: "desc" },
    include: { files: true },
  });

  if (!currentVersion) {
    return NextResponse.json(
      { error: "no_live_version", message: "Source site has no live version to duplicate" },
      { status: 400 },
    );
  }

  // Generate new slug with retries
  let newSlug: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateSlug();
    const existing = await prisma.site.findUnique({ where: { slug: candidate } });
    if (!existing) {
      newSlug = candidate;
      break;
    }
  }

  if (!newSlug) {
    return NextResponse.json(
      { error: "slug_generation_failed", message: "Could not generate unique slug" },
      { status: 500 },
    );
  }

  const totalSize = currentVersion.files.reduce((sum, f) => sum + f.size, 0);

  await prisma.$transaction(async (tx) => {
    // Create new site (no password, no ttl per spec)
    const newSite = await tx.site.create({
      data: {
        userId: user.id,
        slug: newSlug!,
        status: "live",
        metadata: site.metadata ?? {},
      },
    });

    // Create new version (v1, live, finalized)
    const newVersion = await tx.siteVersion.create({
      data: {
        siteId: newSite.id,
        versionNumber: 1,
        status: "live",
        isLive: true,
        requiresFinalize: false,
        finalizedAt: new Date(),
      },
    });

    // Update site with currentVersionId
    await tx.site.update({
      where: { id: newSite.id },
      data: { currentVersionId: newVersion.id },
    });

    // Copy all SiteFile records
    if (currentVersion.files.length > 0) {
      await tx.siteFile.createMany({
        data: currentVersion.files.map((f) => ({
          versionId: newVersion.id,
          path: f.path,
          hash: f.hash,
          size: f.size,
          contentType: f.contentType,
        })),
      });
    }

    // Increment FileBlob refCounts for all unique hashes
    const uniqueHashes = [...new Set(currentVersion.files.map((f) => f.hash))];
    for (const hash of uniqueHashes) {
      await tx.fileBlob.update({
        where: { hash },
        data: { refCount: { increment: 1 } },
      });
    }
  });

  // Increment user's site count
  await incrementSiteCount(user.id, totalSize);

  return NextResponse.json({
    slug: newSlug,
    siteUrl: `https://${newSlug}.${PUB_DOMAIN}`,
  });
}
