import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

function isOwner(site: any, userId: string | null, claimToken: string | null): boolean {
  if (site.userId && userId && site.userId === userId) return true;
  if (site.claimToken && claimToken && site.claimToken === claimToken) return true;
  return false;
}

/**
 * POST: Finalize a version to make it live.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get("claimToken");

  const site = await prisma.site.findUnique({ where: { slug } });
  if (!site || site.status === "deleted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isOwner(site, user?.id ?? null, claimToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get latest pending version
  const pendingVersion = await prisma.siteVersion.findFirst({
    where: { siteId: site.id, status: "pending" },
    orderBy: { versionNumber: "desc" },
    include: {
      uploads: true,
    },
  });

  if (!pendingVersion) {
    return NextResponse.json(
      { error: "no_pending_version", message: "No pending version to finalize" },
      { status: 400 },
    );
  }

  // Check all uploads are completed
  const incompleteUploads = pendingVersion.uploads.filter((u) => !u.completed);
  if (incompleteUploads.length > 0) {
    return NextResponse.json(
      {
        error: "incomplete_uploads",
        pending: incompleteUploads.map((u) => u.path),
      },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    // Set this version to live
    await tx.siteVersion.update({
      where: { id: pendingVersion.id },
      data: {
        status: "live",
        isLive: true,
        finalizedAt: new Date(),
      },
    });

    // Supersede any previous live versions
    await tx.siteVersion.updateMany({
      where: {
        siteId: site.id,
        isLive: true,
        id: { not: pendingVersion.id },
      },
      data: {
        status: "superseded",
        isLive: false,
      },
    });

    // Update site
    await tx.site.update({
      where: { id: site.id },
      data: {
        currentVersionId: pendingVersion.id,
        status: "live",
      },
    });
  });

  return NextResponse.json({
    ok: true,
    slug,
    versionNumber: pendingVersion.versionNumber,
    siteUrl: `https://${slug}.${PUB_DOMAIN}`,
  });
}
