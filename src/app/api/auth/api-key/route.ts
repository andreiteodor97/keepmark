import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, generateApiKey } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key, hash } = generateApiKey();

  await prisma.user.update({
    where: { id: user.id },
    data: { apiKeyHash: hash },
  });

  return NextResponse.json({ key });
}
