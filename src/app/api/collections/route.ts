import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ collections });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = slugify(name.trim());

  // Check for existing collection with same slug
  const existing = await prisma.collection.findUnique({
    where: { userId_slug: { userId: user.id, slug } },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id, name: existing.name, slug: existing.slug });
  }

  const collection = await prisma.collection.create({
    data: {
      userId: user.id,
      name: name.trim(),
      slug,
    },
  });

  return NextResponse.json(
    { id: collection.id, name: collection.name, slug: collection.slug },
    { status: 201 },
  );
}
