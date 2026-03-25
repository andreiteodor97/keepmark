import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto";
import { nanoid, customAlphabet } from "nanoid";

/**
 * Merge Tailwind CSS classes with clsx. Handles conflicts correctly.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

/**
 * Convert text to a URL-safe slug.
 * Lowercase, replace spaces/special chars with hyphens, collapse multiples, trim.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
    .replace(/[\s-]+/g, "-") // collapse spaces/hyphens into single hyphen
    .replace(/^-+/, "") // trim leading hyphens
    .replace(/-+$/, ""); // trim trailing hyphens
}

/**
 * Normalize a URL for deduplication.
 * Lowercases protocol+host, removes trailing slash, strips common tracking params.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase protocol and hostname (URL constructor already does this,
    // but be explicit)
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "fbclid",
      "gclid",
      "gclsrc",
      "dclid",
      "msclkid",
      "twclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "_ga",
      "_gl",
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining params for consistency
    parsed.searchParams.sort();

    // Build the URL string and remove trailing slash
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    // If URL parsing fails, return as-is lowercased
    return url.toLowerCase();
  }
}

/**
 * SHA-256 hash of a normalized URL.
 */
export function hashUrl(url: string): string {
  const normalized = normalizeUrl(url);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Parse relative time strings like "7d", "24h", "30m" into a Date (subtracted from now).
 * Returns null if the input can't be parsed.
 */
export function parseRelativeTime(input: string): Date | null {
  const match = input.trim().match(/^(\d+)\s*(d|h|m|s)$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const ms = amount * multipliers[unit];
  return new Date(Date.now() - ms);
}

/**
 * Returns "YYYY-MM" for the current month.
 */
export function getMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const alphanumericNanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);

/**
 * Generate a 12-character alphanumeric ID using nanoid.
 */
export function generateId(): string {
  return alphanumericNanoid();
}
