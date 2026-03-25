import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Get all non-archived items with their tags
  const items = await prisma.item.findMany({
    where: {
      userId: user.id,
      status: { not: "archived" },
    },
    select: { tags: true },
  });

  // Aggregate unique tags from JSON arrays
  const tagMap = new Map<string, string>(); // slug -> name
  for (const item of items) {
    const tags = item.tags as string[];
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        const slug = slugify(tag);
        if (!tagMap.has(slug)) {
          tagMap.set(slug, tag);
        }
      }
    }
  }

  const tags = Array.from(tagMap.entries())
    .map(([slug, name]) => ({ name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ tags });
}
