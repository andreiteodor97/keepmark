import { createHash } from "crypto";
import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import type { Readable } from "stream";

const BLOB_STORAGE_PATH =
  process.env.BLOB_STORAGE_PATH || "/data/keepmark/blobs";

/**
 * Derive the on-disk path for a given content-addressable hash.
 * Uses a two-level directory structure: first 2 chars / next 2 chars / full hash
 * e.g. hash "abcdef1234..." -> /data/keepmark/blobs/ab/cd/abcdef1234...
 */
function blobPath(hash: string): string {
  const dir1 = hash.slice(0, 2);
  const dir2 = hash.slice(2, 4);
  return path.join(BLOB_STORAGE_PATH, dir1, dir2, hash);
}

/**
 * Open a readable stream for a blob identified by its SHA-256 hash.
 * Returns the Node.js Readable stream and the file size in bytes.
 * Throws if the blob does not exist on disk.
 */
export async function readBlob(
  hash: string
): Promise<{ stream: Readable; size: number }> {
  const filePath = blobPath(hash);
  const stats = await stat(filePath);
  const stream = createReadStream(filePath);
  return { stream, size: stats.size };
}

/**
 * Write a buffer to blob storage. Returns the storage key (on-disk path).
 */
export async function writeBlob(buffer: Buffer, hash: string): Promise<string> {
  const filePath = blobPath(hash);
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, buffer);
  return filePath;
}

/**
 * Check whether a blob exists on disk for the given hash.
 */
export async function blobExists(hash: string): Promise<boolean> {
  try {
    await stat(blobPath(hash));
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute the SHA-256 hash of a buffer.
 */
export function computeHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Delete a blob from disk by its storage key (path).
 */
export async function deleteBlob(storageKey: string): Promise<void> {
  try {
    await unlink(storageKey);
  } catch {
    // Blob may already be deleted; ignore
  }
}
