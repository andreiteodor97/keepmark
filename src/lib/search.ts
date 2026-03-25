export interface ParsedSearchQuery {
  /** Remaining free text after extracting filters */
  text: string;
  /** Tags extracted from tag:xxx or tag:"xxx yyy" */
  tags: string[];
  /** Collections extracted from in:xxx or in:"xxx yyy" */
  collections: string[];
}

/**
 * Parse a search query string, extracting structured filters (tag:, in:)
 * and returning the remaining free text.
 *
 * Examples:
 *   "react hooks tag:frontend in:reading-list"
 *   → { text: "react hooks", tags: ["frontend"], collections: ["reading-list"] }
 *
 *   'tag:"web dev" in:"my stuff" typescript'
 *   → { text: "typescript", tags: ["web dev"], collections: ["my stuff"] }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const tags: string[] = [];
  const collections: string[] = [];

  // Match tag:"multi word" or tag:single-word
  const tagQuotedRegex = /tag:"([^"]+)"/g;
  const tagWordRegex = /tag:(\S+)/g;

  // Match in:"multi word" or in:single-word
  const inQuotedRegex = /in:"([^"]+)"/g;
  const inWordRegex = /in:(\S+)/g;

  let remaining = query;

  // Extract quoted tags first (so they don't interfere with word-level matching)
  remaining = remaining.replace(tagQuotedRegex, (_, value) => {
    tags.push(value.trim());
    return "";
  });

  remaining = remaining.replace(tagWordRegex, (_, value) => {
    tags.push(value.trim());
    return "";
  });

  // Extract quoted collections first
  remaining = remaining.replace(inQuotedRegex, (_, value) => {
    collections.push(value.trim());
    return "";
  });

  remaining = remaining.replace(inWordRegex, (_, value) => {
    collections.push(value.trim());
    return "";
  });

  // Clean up: collapse whitespace, trim
  const text = remaining.replace(/\s+/g, " ").trim();

  return { text, tags, collections };
}

/**
 * Convert user search text into a PostgreSQL tsquery string.
 *
 * - Splits by whitespace
 * - Joins words with " & " (AND)
 * - Appends ":*" to the last word for prefix matching (autocomplete-style)
 * - Sanitizes input to prevent tsquery syntax errors
 *
 * Examples:
 *   "react hooks"   → "react & hooks:*"
 *   "hello"         → "hello:*"
 *   ""              → ""
 */
export function buildTsQuery(text: string): string {
  // Remove characters that could break tsquery syntax
  const sanitized = text.replace(/[^\w\s-]/g, "").trim();

  if (!sanitized) return "";

  const words = sanitized.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "";

  if (words.length === 1) {
    return `${words[0]}:*`;
  }

  // All words except last are exact matches, last word gets prefix matching
  const exactWords = words.slice(0, -1).join(" & ");
  const lastWord = words[words.length - 1];

  return `${exactWords} & ${lastWord}:*`;
}
