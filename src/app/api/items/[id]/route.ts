import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { toItemResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const include = searchParams.get("include");
  const includeContent = include === "content";

  const item = await prisma.item.findFirst({
    where: { id, userId: user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(toItemResponse(item, includeContent));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, userId: user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, notes, tags, collectionIds, archived, processed, status } = body as {
    title?: string;
    notes?: string;
    tags?: string[];
    collectionIds?: string[];
    archived?: boolean;
    processed?: boolean;
    status?: string;
  };

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (title !== undefined) updateData.title = title;
  if (notes !== undefined) updateData.notes = notes;

  if (tags !== undefined) {
    updateData.tags = tags;
    updateData.tagSlugs = tags.map((t) => slugify(t));
  }

  // Support explicit status field (stashed, flagged, archived)
  if (status && ["stashed", "flagged", "archived"].includes(status)) {
    updateData.status = status;
  } else {
    if (archived === true) updateData.status = "archived";
    if (archived === false) updateData.status = "stashed";
  }

  if (processed === true) updateData.processedAt = new Date();
  if (processed === false) updateData.processedAt = null;

  const updated = await prisma.item.update({
    where: { id, userId: user.id },
    data: updateData,
  });

  // Handle collection assignments
  if (collectionIds !== undefined) {
    // Resolve collection ids — accept id, name, or slug
    const resolvedCollections = await prisma.collection.findMany({
      where: {
        userId: user.id,
        OR: collectionIds.flatMap((c) => [
          { id: c },
          { slug: c },
          { name: c },
        ]),
      },
    });

    // Delete existing assignments
    await prisma.itemCollection.deleteMany({
      where: { itemId: id },
    });

    // Insert new assignments
    if (resolvedCollections.length > 0) {
      await prisma.itemCollection.createMany({
        data: resolvedCollections.map((col) => ({
          itemId: id,
          collectionId: col.id,
        })),
      });
    }
  }

  return NextResponse.json(toItemResponse(updated, false));
}
