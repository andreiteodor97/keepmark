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

function isAutoViewerType(contentType: string): boolean {
  return (
    contentType.startsWith("image/") ||
    contentType === "application/pdf" ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/")
  );
}

function renderAutoViewer(
  fileUrl: string,
  filename: string,
  contentType: string,
  size: number,
  metadata?: Record<string, unknown>
): string {
  if (contentType.startsWith("image/")) {
    return imageViewer(fileUrl, filename, metadata);
  }
  if (contentType === "application/pdf") {
    return pdfViewer(fileUrl, filename);
  }
  if (contentType.startsWith("video/")) {
    return videoViewer(fileUrl, filename);
  }
  if (contentType.startsWith("audio/")) {
    return audioViewer(fileUrl, filename);
  }
  return downloadPage(fileUrl, filename, size, contentType);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: pathSegments } = await params;
  const requestPath = pathSegments.join("/");

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

  // Serving fallback chain

  // a. Exact file match
  let matchedFile = files.find((f) => f.path === requestPath);

  // b. Subdir index
  if (!matchedFile) {
    matchedFile = files.find((f) => f.path === `${requestPath}/index.html`);
  }

  // c. Single-file site with auto-viewer
  if (!matchedFile && files.length === 1) {
    const singleFile = files[0];
    if (isAutoViewerType(singleFile.contentType)) {
      const fileUrl = `/${singleFile.path}`;
      const filename = singleFile.path.split("/").pop() || singleFile.path;
      const html = renderAutoViewer(
        fileUrl,
        filename,
        singleFile.contentType,
        singleFile.size,
        metadata
      );
      return htmlResponse(html);
    }
  }

  // d. Directory listing
  if (!matchedFile) {
    const prefix = requestPath.endsWith("/") ? requestPath : requestPath + "/";
    const dirFiles = files.filter((f) => f.path.startsWith(prefix));

    if (dirFiles.length > 0) {
      const entries = buildDirectoryEntries(dirFiles, prefix);
      const html = directoryListing(requestPath, entries);
      return htmlResponse(html);
    }
  }

  // e. 404
  if (!matchedFile) {
    return htmlResponse(fileNotFoundPage(), 404);
  }

  // Serve the matched file
  try {
    const { stream, size } = await readBlob(matchedFile.hash);
    const webStream = nodeReadableToWeb(stream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": matchedFile.contentType,
        "Content-Length": String(size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return htmlResponse(fileNotFoundPage(), 404);
  }
}

function buildDirectoryEntries(
  files: { path: string; size: number; contentType: string }[],
  prefix: string
): DirectoryEntry[] {
  const seen = new Set<string>();
  const entries: DirectoryEntry[] = [];

  for (const file of files) {
    const relative = file.path.slice(prefix.length);
    const parts = relative.split("/");
    const firstName = parts[0];

    if (!firstName || seen.has(firstName)) continue;
    seen.add(firstName);

    if (parts.length > 1) {
      // This is a subdirectory
      entries.push({
        name: firstName,
        path: `/${prefix}${firstName}`,
        isDirectory: true,
      });
    } else {
      // This is a file
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
