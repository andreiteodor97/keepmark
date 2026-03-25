import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { checkSiteQuota, incrementSiteCount } from "@/lib/site-quotas";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

interface FileEntry {
  path: string;
  hash: string;
  size: number;
  contentType: string;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  let body: { files?: FileEntry[]; metadata?: { title?: string; description?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Validate files array
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

  // Check quotas
  const quotaCheck = await checkSiteQuota(user?.id ?? null);
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { error: "quota_exceeded", message: quotaCheck.reason },
      { status: 403 },
    );
  }

  // Generate slug with up to 3 retries on unique constraint failure
  let slug: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateSlug();
    const existing = await prisma.site.findUnique({ where: { slug: candidate } });
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  if (!slug) {
    return NextResponse.json(
      { error: "slug_generation_failed", message: "Could not generate unique slug" },
      { status: 500 },
    );
  }

  // Anonymous user setup
  const claimToken = user ? null : nanoid(32);
  const ttl = user ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create site, version, files, and uploads in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create site
    const site = await tx.site.create({
      data: {
        userId: user?.id ?? null,
        slug,
        status: "pending",
        claimToken,
        ttl,
        metadata: body.metadata ?? {},
      },
    });

    // Create version
    const version = await tx.siteVersion.create({
      data: {
        siteId: site.id,
        versionNumber: 1,
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

    // For each unique hash, check if FileBlob exists
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
        // Only create one upload per unique hash
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

    return { site, version, skipped, uploads };
  });

  // Increment site count for authenticated users
  const totalSize = body.files!.reduce((sum, f) => sum + f.size, 0);
  if (user) {
    await incrementSiteCount(user.id, totalSize);
  }

  return NextResponse.json({
    slug,
    siteUrl: `https://${slug}.${PUB_DOMAIN}`,
    uploads: result.uploads,
    skipped: result.skipped,
    claimToken: claimToken ?? undefined,
    status: "pending",
    isLive: false,
    requiresFinalize: true,
    versionNumber: 1,
  });
}
