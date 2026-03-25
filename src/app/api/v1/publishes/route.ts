import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

/**
 * GET: List user's sites.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
  const statusFilter = searchParams.get("status");

  const where: Prisma.SiteWhereInput = { userId: user.id };

  if (statusFilter) {
    where.status = statusFilter;
  } else {
    where.status = { not: "deleted" };
  }

  const [sites, count] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        versions: {
          where: { isLive: true },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: {
              select: { files: true },
            },
          },
        },
      },
    }),
    prisma.site.count({ where }),
  ]);

  const sitesResponse = sites.map((site) => {
    const currentVersion = site.versions[0] ?? null;
    return {
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
            fileCount: currentVersion._count.files,
          }
        : null,
    };
  });

  return NextResponse.json({
    sites: sitesResponse,
    limit,
    offset,
    count,
  });
}
