import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteBlob } from "@/lib/blobs";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

interface FileEntry {
  path: string;
  hash: string;
  size: number;
  contentType: string;
}

function isOwner(site: any, userId: string | null, claimToken: string | null): boolean {
  if (site.userId && userId && site.userId === userId) return true;
  if (site.claimToken && claimToken && site.claimToken === claimToken) return true;
  return false;
}

/**
 * GET: Get site manifest.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get("claimToken");

  const site = await prisma.site.findUnique({
    where: { slug },
    include: {
      versions: {
        where: { isLive: true },
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          files: {
            select: {
              path: true,
              hash: true,
              size: true,
              contentType: true,
            },
          },
        },
      },
    },
  });

  if (!site || site.status === "deleted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isOwner(site, user?.id ?? null, claimToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const currentVersion = site.versions[0] ?? null;

  return NextResponse.json({
    id: site.id,
    slug: site.slug,
    status: site.status,
    siteUrl: `https://${site.slug}.${PUB_DOMAIN}`,
    metadata: site.metadata,
    hasPassword: !!site.password,
    ttl: site.ttl,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    currentVersion: currentVersion
      ? {
          versionNumber: currentVersion.versionNumber,
          status: currentVersion.status,
          isLive: currentVersion.isLive,
          finalizedAt: currentVersion.finalizedAt,
          files: currentVersion.files,
        }
      : null,
  });
}

/**
 * PUT: Update site (create new version).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getUserFromRequest(request);
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get("claimToken");

  let body: { files?: FileEntry[]; metadata?: { title?: string; description?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "files_required" }, { status: 400 });
  }

  for (const file of body.files) {
    if (!file.path || !file.hash || file.size == null || !file.contentType) {
      return NextResponse.json(
        { error: "invalid_file_entry", message: "Each file needs path, hash, size, contentType" },
        { status: 400 },
      );
    }
  }

  const site = await prisma.site.findUnique({ where: { slug } });
  if (!site || site.status === "deleted") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isOwner(site, user?.id ?? null, claimToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Update metadata if provided
  if (body.metadata) {
    await prisma.site.update({
      where: { id: site.id },
      data: {
        metadata: { ...(site.metadata as Record<string, unknown>), ...body.metadata },
      },
    });
  }

  // Get the latest version number
  const latestVersion = await prisma.siteVersion.findFirst({
    where: { siteId: site.id },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  const result = await prisma.$transaction(async (tx) => {
    // Create new version
    const version = await tx.siteVersion.create({
      data: {
        siteId: site.id,
        versionNumber: nextVersionNumber,
        status: "pending",
        requiresFinalize: true,
      },
    });

    // Create site file records
    await tx.siteFile.createMany({
      data: body.files!.map((f) => ({
        versionId: version.id,
        path: f.path,
        hash: f.hash,
        size: f.size,
        contentType: f.contentType,
      })),
    });

    // Check existing blobs
    const uniqueHashes = [...new Set(body.files!.map((f) => f.hash))];
    const existingBlobs = await tx.fileBlob.findMany({
      where: { hash: { in: uniqueHashes } },
    });
    const existingHashSet = new Set(existingBlobs.map((b) => b.hash));

    const skipped: string[] = [];
    const uploads: { token: string; hash: string; path: string; uploadUrl: string }[] = [];

    for (const file of body.files!) {
      if (existingHashSet.has(file.hash)) {
        skipped.push(file.path);
      } else {
        const alreadyQueued = uploads.find((u) => u.hash === file.hash);
        if (!alreadyQueued) {
          const uploadToken = nanoid(32);
          await tx.upload.create({
            data: {
              versionId: version.id,
              fileHash: file.hash,
              path: file.path,
              token: uploadToken,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
          });
          uploads.push({
            token: uploadToken,
            hash: file.hash,
            path: file.path,
            uploadUrl: "/api/v1/uploads",
          });
        }
      }
    }

    return { version, skipped, uploads };
  });

  return NextResponse.json({
    slug,
    siteUrl: `https://${slug}.${PUB_DOMAIN}`,
    uploads: result.uploads,
    skipped: result.skipped,
    status: "pending",
    isLive: false,
    requiresFinalize: true,
    versionNumber: nextVersionNumber,
  });
}

/**
 * DELETE: Delete site.
 */
export async function DELETE(
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

  // DELETE requires owner only (not claimToken)
  if (!site.userId || site.userId !== user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get all file hashes used by this site's versions
  const allFiles = await prisma.siteFile.findMany({
    where: { version: { siteId: site.id } },
    select: { hash: true },
  });
  const uniqueHashes = [...new Set(allFiles.map((f) => f.hash))];

  // Decrement refCounts and delete orphan blobs
  for (const hash of uniqueHashes) {
    const blob = await prisma.fileBlob.update({
      where: { hash },
      data: { refCount: { decrement: 1 } },
    });

    if (blob.refCount <= 0) {
      await deleteBlob(blob.storageKey);
      await prisma.fileBlob.delete({ where: { hash } });
    }
  }

  // Mark site as deleted
  await prisma.site.update({
    where: { id: site.id },
    data: { status: "deleted" },
  });

  return NextResponse.json({ ok: true });
}
