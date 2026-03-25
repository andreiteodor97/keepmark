import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isOwner(site: any, userId: string | null, claimToken: string | null): boolean {
  if (site.userId && userId && site.userId === userId) return true;
  if (site.claimToken && claimToken && site.claimToken === claimToken) return true;
  return false;
}

/**
 * POST: Refresh expired upload tokens.
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

  // Find latest pending version
  const pendingVersion = await prisma.siteVersion.findFirst({
    where: { siteId: site.id, status: "pending" },
    orderBy: { versionNumber: "desc" },
  });

  if (!pendingVersion) {
    return NextResponse.json(
      { error: "no_pending_version", message: "No pending version found" },
      { status: 400 },
    );
  }

  // Find all incomplete uploads for this version
  const incompleteUploads = await prisma.upload.findMany({
    where: {
      versionId: pendingVersion.id,
      completed: false,
    },
  });

  const now = new Date();
  const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const uploads: { token: string; hash: string; path: string; uploadUrl: string }[] = [];

  for (const upload of incompleteUploads) {
    if (upload.expiresAt < now) {
      // Expired: generate new token and expiry
      const newToken = nanoid(32);
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
        },
      });
      uploads.push({
        token: newToken,
        hash: upload.fileHash,
        path: upload.path,
        uploadUrl: "/api/v1/uploads",
      });
    } else {
      // Still valid: return existing token
      uploads.push({
        token: upload.token,
        hash: upload.fileHash,
        path: upload.path,
        uploadUrl: "/api/v1/uploads",
      });
    }
  }

  return NextResponse.json({ uploads });
}
