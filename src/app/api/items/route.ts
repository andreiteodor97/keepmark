import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseRelativeTime, slugify } from "@/lib/utils";
import { toItemResponse } from "@/types";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");
  const statusRaw = searchParams.get("status");
  const tagsRaw = searchParams.get("tags");
  const collectionRaw = searchParams.get("collection");
  const include = searchParams.get("include");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 1), 1000);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  const includeContent = include === "content";

  // Build where clause
  const where: Prisma.ItemWhereInput = { userId: user.id };

  // Date filters
  if (sinceRaw || untilRaw) {
    where.createdAt = {};
    if (sinceRaw) {
      const since = parseRelativeTime(sinceRaw) ?? new Date(sinceRaw);
      where.createdAt.gte = since;
    }
    if (untilRaw) {
      const until = parseRelativeTime(untilRaw) ?? new Date(untilRaw);
      where.createdAt.lte = until;
    }
  }

  // Status filter
  if (statusRaw) {
    const statuses = statusRaw.split(",").map((s) => s.trim()).filter(Boolean);
    where.status = { in: statuses };
  } else {
    // When omitted, exclude archived
    where.status = { not: "archived" };
  }

  // Tags filter — match by name or slug in JSON arrays
  if (tagsRaw) {
    const tagsList = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const tagConditions: Prisma.ItemWhereInput[] = [];
    for (const tag of tagsList) {
      const tagSlug = slugify(tag);
      tagConditions.push({ tagSlugs: { array_contains: tagSlug } });
    }
    where.AND = tagConditions;
  }

  // Collection filter — join through ItemCollection
  if (collectionRaw) {
    const collection = await prisma.collection.findFirst({
      where: {
        userId: user.id,
        OR: [
          { id: collectionRaw },
          { slug: collectionRaw },
          { name: collectionRaw },
        ],
      },
    });
    if (collection) {
      where.collections = { some: { collectionId: collection.id } };
    } else {
      // No matching collection — return empty
      return NextResponse.json({ items: [], limit, offset, count: 0 });
    }
  }

  const [items, count] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.item.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => toItemResponse(item, includeContent)),
    limit,
    offset,
    count,
  });
}
