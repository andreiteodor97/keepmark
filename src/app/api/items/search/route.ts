import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSearchQuery, buildTsQuery } from "@/lib/search";
import { parseRelativeTime, slugify } from "@/lib/utils";
import { toItemResponse } from "@/types";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
  }

  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");
  const statusRaw = searchParams.get("status");
  const tagsRaw = searchParams.get("tags");
  const collectionRaw = searchParams.get("collection");
  const include = searchParams.get("include");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 1), 1000);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  const includeContent = include === "content";

  // Parse the search query
  const parsed = parseSearchQuery(q);

  // Merge tags from query syntax and query param
  const allTags = [...parsed.tags];
  if (tagsRaw) {
    allTags.push(...tagsRaw.split(",").map((t) => t.trim()).filter(Boolean));
  }

  // Merge collections from query syntax and query param
  const allCollections = [...parsed.collections];
  if (collectionRaw) {
    allCollections.push(collectionRaw);
  }

  // Get FTS results if there's text to search
  let ftsIds: string[] | null = null;
  if (parsed.text.trim()) {
    const tsQuery = buildTsQuery(parsed.text);
    const ftsResults = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM items
      WHERE user_id = ${user.id}
        AND search_vector @@ to_tsquery('english', ${tsQuery})
      ORDER BY ts_rank(search_vector, to_tsquery('english', ${tsQuery})) DESC
    `;
    ftsIds = ftsResults.map((r) => r.id);

    if (ftsIds.length === 0) {
      return NextResponse.json({ items: [], limit, offset, count: 0 });
    }
  }

  // Build where clause
  const where: Prisma.ItemWhereInput = { userId: user.id };

  if (ftsIds) {
    where.id = { in: ftsIds };
  }

  // Date filters
  if (sinceRaw || untilRaw) {
    where.createdAt = {};
    if (sinceRaw) {
      where.createdAt.gte = parseRelativeTime(sinceRaw) ?? new Date(sinceRaw);
    }
    if (untilRaw) {
      where.createdAt.lte = parseRelativeTime(untilRaw) ?? new Date(untilRaw);
    }
  }

  // Status filter
  if (statusRaw) {
    const statuses = statusRaw.split(",").map((s) => s.trim()).filter(Boolean);
    where.status = { in: statuses };
  } else {
    where.status = { not: "archived" };
  }

  // Tags filter
  if (allTags.length > 0) {
    const tagConditions: Prisma.ItemWhereInput[] = [];
    for (const tag of allTags) {
      const tagSlug = slugify(tag);
      tagConditions.push({ tagSlugs: { array_contains: tagSlug } });
    }
    where.AND = tagConditions;
  }

  // Collection filter
  if (allCollections.length > 0) {
    const collections = await prisma.collection.findMany({
      where: {
        userId: user.id,
        OR: allCollections.flatMap((c) => [
          { id: c },
          { slug: c },
          { name: c },
        ]),
      },
    });
    if (collections.length > 0) {
      where.collections = {
        some: { collectionId: { in: collections.map((c) => c.id) } },
      };
    } else {
      return NextResponse.json({ items: [], limit, offset, count: 0 });
    }
  }

  const [items, count] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: ftsIds ? undefined : { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.item.count({ where }),
  ]);

  // If FTS, preserve rank order
  let sortedItems = items;
  if (ftsIds) {
    const idOrder = new Map(ftsIds.map((id, idx) => [id, idx]));
    sortedItems = [...items].sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
  }

  return NextResponse.json({
    items: sortedItems.map((item) => toItemResponse(item, includeContent)),
    limit,
    offset,
    count,
  });
}
