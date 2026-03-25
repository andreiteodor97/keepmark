import type { Item, Collection } from "@prisma/client";

// --------------------------------------------------------------------------
// API Response Types
// --------------------------------------------------------------------------

export interface ItemResponse {
  id: string;
  url: string;
  urlHash: string;
  title: string | null;
  favicon: string | null;
  createdAt: number; // unix timestamp (seconds)
  lastSeenAt: number;
  updatedAt: number;
  status: string;
  timesAdded: number;
  notes: string | null;
  tags: string[];
  tagSlugs: string[];
  contentExtractedAt: number | null;
  contentSize: number | null;
  contentExtractError: string | null;
  contentTruncated: boolean;
  contentSource: string | null;
  contentAvailable: boolean;
  contentMarkdown?: string;
  content?: ContentJson;
  processedAt: number | null;
  collections?: CollectionResponse[];
}

export interface ContentJson {
  schemaVersion: 2;
  items: Record<
    string,
    {
      format: "markdown";
      markdown: string;
      meta?: Record<string, unknown>;
    }
  >;
}

export interface CollectionResponse {
  id: string;
  name: string;
  slug: string;
}

export interface TagResponse {
  name: string;
  slug: string;
}

export interface SyncResponse {
  received: number;
  accepted: number;
  upserted: number;
  added: number;
  skipped: number;
  limitReached: boolean;
  linkLimit: number;
  linkCount: number;
  linkCountLifetime: number;
  linkCountMonth: number;
  linkCountMonthKey: string;
}

export interface QuotaError {
  error: "quota_reached";
  message: string;
  plan: string;
  limitScope: "lifetime" | "month";
  linkLimit: number;
  linkCount: number;
}

// --------------------------------------------------------------------------
// Prisma-to-API Conversion
// --------------------------------------------------------------------------

/** Type for an Item with its collections relation loaded */
type ItemWithCollections = Item & {
  collections?: Array<{
    collection: Collection;
  }>;
};

/**
 * Convert a Prisma Item model to the API response format.
 *
 * - Converts Date fields to unix timestamps (seconds)
 * - Parses JSON fields (tags, tagSlugs, contentJson)
 * - Optionally includes content markdown and structured content
 * - Maps joined collections to the response shape
 */
export function toItemResponse(
  item: ItemWithCollections,
  includeContent: boolean = false
): ItemResponse {
  const tags = parseJsonArray<string>(item.tags);
  const tagSlugs = parseJsonArray<string>(item.tagSlugs);

  const response: ItemResponse = {
    id: item.id,
    url: item.url,
    urlHash: item.urlHash,
    title: item.title,
    favicon: item.favicon,
    createdAt: dateToUnix(item.createdAt),
    lastSeenAt: dateToUnix(item.lastSeenAt),
    updatedAt: dateToUnix(item.updatedAt),
    status: item.status,
    timesAdded: item.timesAdded,
    notes: item.notes,
    tags,
    tagSlugs,
    contentExtractedAt: item.contentExtractedAt
      ? dateToUnix(item.contentExtractedAt)
      : null,
    contentSize: item.contentSize,
    contentExtractError: item.contentExtractError,
    contentTruncated: item.contentTruncated,
    contentSource: item.contentSource,
    contentAvailable: item.contentAvailable,
    processedAt: item.processedAt ? dateToUnix(item.processedAt) : null,
  };

  if (includeContent) {
    response.contentMarkdown = item.contentMarkdown ?? undefined;
    response.content = item.contentJson
      ? parseContentJson(item.contentJson)
      : undefined;
  }

  if (item.collections) {
    response.collections = item.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
      slug: ic.collection.slug,
    }));
  }

  return response;
}

// --------------------------------------------------------------------------
// Internal Helpers
// --------------------------------------------------------------------------

/**
 * Convert a Date to a unix timestamp in seconds.
 */
function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Safely parse a Prisma JSON field that should be a string array.
 * Handles both already-parsed arrays and JSON strings.
 */
function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parse a Prisma JSON field into ContentJson.
 */
function parseContentJson(value: unknown): ContentJson | undefined {
  if (value === null || value === undefined) return undefined;

  // If already an object (Prisma parses JSON columns automatically)
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.schemaVersion === 2 && obj.items) {
      return obj as unknown as ContentJson;
    }
  }

  // If stored as a string somehow
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed.schemaVersion === 2 && parsed.items) {
        return parsed as ContentJson;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}
