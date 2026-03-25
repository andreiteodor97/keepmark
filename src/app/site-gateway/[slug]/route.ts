import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readBlob } from "@/lib/blobs";
import { createHash } from "crypto";
import type { Readable } from "stream";
import {
  imageViewer,
  pdfViewer,
  videoViewer,
  audioViewer,
  downloadPage,
  directoryListing,
  passwordPrompt,
  notFoundPage,
  fileNotFoundPage,
  type DirectoryEntry,
} from "@/lib/viewers";

function nodeReadableToWeb(nodeReadable: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeReadable.on("data", (chunk) => controller.enqueue(chunk));
      nodeReadable.on("end", () => controller.close());
      nodeReadable.on("error", (err) => controller.error(err));
    },
  });
}

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Look up site
  const site = await prisma.site.findUnique({
    where: { slug },
  });

  if (!site || site.status !== "live") {
    return htmlResponse(notFoundPage(), 404);
  }

  // Password check
  if (site.password) {
    const cookieName = `km_site_auth_${slug}`;
    const cookieValue = request.cookies.get(cookieName)?.value;
    const expectedHash = createHash("sha256")
      .update(site.password + slug)
      .digest("hex");

    if (!cookieValue || cookieValue !== expectedHash) {
      return htmlResponse(passwordPrompt(slug), 401);
    }
  }

  // Get current live version with files
  const liveVersion = await prisma.siteVersion.findFirst({
    where: {
      siteId: site.id,
      isLive: true,
    },
    include: {
      files: true,
    },
    orderBy: { versionNumber: "desc" },
  });

  if (!liveVersion || liveVersion.files.length === 0) {
    return htmlResponse(fileNotFoundPage(), 404);
  }

  const files = liveVersion.files;
  const metadata = (site.metadata ?? {}) as Record<string, unknown>;

  // Root path serving fallback chain

  // a. Look for index.html
  const indexFile = files.find((f) => f.path === "index.html");

  if (indexFile) {
    try {
      const { stream, size } = await readBlob(indexFile.hash);
      const webStream = nodeReadableToWeb(stream);

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": indexFile.contentType,
          "Content-Length": String(size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return htmlResponse(fileNotFoundPage(), 404);
    }
  }

  // b. Single-file site with auto-viewer
  if (files.length === 1) {
    const singleFile = files[0];
    const fileUrl = `/${singleFile.path}`;
    const filename = singleFile.path.split("/").pop() || singleFile.path;

    if (singleFile.contentType.startsWith("image/")) {
      return htmlResponse(imageViewer(fileUrl, filename, metadata));
    }
    if (singleFile.contentType === "application/pdf") {
      return htmlResponse(pdfViewer(fileUrl, filename));
    }
    if (singleFile.contentType.startsWith("video/")) {
      return htmlResponse(videoViewer(fileUrl, filename));
    }
    if (singleFile.contentType.startsWith("audio/")) {
      return htmlResponse(audioViewer(fileUrl, filename));
    }
    return htmlResponse(
      downloadPage(fileUrl, filename, singleFile.size, singleFile.contentType)
    );
  }

  // c. Directory listing of root
  const entries = buildRootEntries(files);
  return htmlResponse(directoryListing("", entries));
}

function buildRootEntries(
  files: { path: string; size: number; contentType: string }[]
): DirectoryEntry[] {
  const seen = new Set<string>();
  const entries: DirectoryEntry[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    const firstName = parts[0];

    if (!firstName || seen.has(firstName)) continue;
    seen.add(firstName);

    if (parts.length > 1) {
      entries.push({
        name: firstName,
        path: `/${firstName}`,
        isDirectory: true,
      });
    } else {
      entries.push({
        name: firstName,
        path: `/${file.path}`,
        isDirectory: false,
        size: file.size,
        contentType: file.contentType,
      });
    }
  }

  return entries;
}
