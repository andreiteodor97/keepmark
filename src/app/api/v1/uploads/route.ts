import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeBlob } from "@/lib/blobs";

/**
 * POST: Upload a file by token.
 */
export async function POST(request: NextRequest) {
  // Extract token from Authorization header or query param
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    token = searchParams.get("token");
  }

  if (!token) {
    return NextResponse.json(
      { error: "missing_token", message: "Provide upload token via Authorization header or ?token= query" },
      { status: 401 },
    );
  }

  // Look up upload
  const upload = await prisma.upload.findUnique({ where: { token } });
  if (!upload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Check expiration
  if (upload.expiresAt < new Date()) {
    return NextResponse.json({ error: "token_expired" }, { status: 410 });
  }

  // Check if already completed
  if (upload.completed) {
    return NextResponse.json(
      { error: "already_completed", message: "This upload has already been completed" },
      { status: 409 },
    );
  }

  // Read body
  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  // Write blob to storage
  const storageKey = await writeBlob(buffer, upload.fileHash);

  // Upsert FileBlob
  await prisma.$transaction(async (tx) => {
    const existingBlob = await tx.fileBlob.findUnique({
      where: { hash: upload.fileHash },
    });

    if (existingBlob) {
      await tx.fileBlob.update({
        where: { hash: upload.fileHash },
        data: { refCount: { increment: 1 } },
      });
    } else {
      // Get file info from the SiteFile records that reference this hash
      const siteFile = await tx.siteFile.findFirst({
        where: { hash: upload.fileHash, versionId: upload.versionId },
      });

      await tx.fileBlob.create({
        data: {
          hash: upload.fileHash,
          size: buffer.length,
          contentType: siteFile?.contentType ?? "application/octet-stream",
          storageKey,
          refCount: 1,
        },
      });
    }

    // Mark upload as completed
    await tx.upload.update({
      where: { id: upload.id },
      data: { completed: true },
    });
  });

  return NextResponse.json({
    ok: true,
    hash: upload.fileHash,
    size: buffer.length,
  });
}
