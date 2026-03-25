import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PUB_DOMAIN = process.env.PUB_DOMAIN || "pub.keepmark.aiia.ro";

/**
 * PATCH: Update site metadata without re-uploading.
 */
export async function PATCH(
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

  // Owner check (not claimToken for metadata updates)
  if (!site.userId || site.userId !== user.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};

  // Handle password
  if ("password" in body) {
    if (body.password === null || body.password === "") {
      updateData.password = null;
    } else {
      updateData.password = await bcrypt.hash(body.password, 10);
    }
  }

  // Merge metadata (exclude password from metadata object)
  const { password, ...metadataFields } = body;
  if (Object.keys(metadataFields).length > 0) {
    const existingMetadata = (site.metadata as Record<string, unknown>) ?? {};
    updateData.metadata = { ...existingMetadata, ...metadataFields };
  }

  const updated = await prisma.site.update({
    where: { id: site.id },
    data: updateData,
  });

  return NextResponse.json({
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
    siteUrl: `https://${updated.slug}.${PUB_DOMAIN}`,
    metadata: updated.metadata,
    hasPassword: !!updated.password,
    ttl: updated.ttl,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}
