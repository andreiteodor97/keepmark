import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, userId: user.id },
    select: {
      contentMarkdown: true,
      contentSize: true,
      contentTruncated: true,
      contentAvailable: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!item.contentAvailable || !item.contentMarkdown) {
    return new NextResponse("No content available", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse(item.contentMarkdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "x-content-size": String(item.contentSize ?? 0),
      "x-content-truncated": String(item.contentTruncated),
    },
  });
}
