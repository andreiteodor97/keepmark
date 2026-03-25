import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { incrementSiteCount } from "@/lib/site-quotas";

/**
 * POST: Claim an anonymous site.
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

  let body: { claimToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.claimToken) {
    return NextResponse.json(
      { error: "claim_token_required" },
      { status: 400 },
    );
  }

  // Find site by slug where claimToken matches and no userId is set
  const site = await prisma.site.findUnique({ where: { slug } });

  if (!site || site.claimToken !== body.claimToken || site.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Calculate total storage for incrementing
  const totalSize = await prisma.siteFile.aggregate({
    where: { version: { siteId: site.id } },
    _sum: { size: true },
  });

  // Claim the site
  await prisma.site.update({
    where: { id: site.id },
    data: {
      userId: user.id,
      claimToken: null,
      ttl: null,
    },
  });

  // Increment user's site count
  await incrementSiteCount(user.id, totalSize._sum.size ?? 0);

  return NextResponse.json({ ok: true, slug });
}
