import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB max
const USER_AGENT = "KeepmarkBot/1.0";

export interface ExtractionResult {
  title: string | null;
  favicon: string | null;
  markdown: string | null;
  contentSource: string; // "readability" | "raw"
  contentSize: number;
  error: string | null;
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

/**
 * Extract content from a URL: fetch HTML, parse with Readability, convert to Markdown.
 */
export async function extractContent(url: string): Promise<ExtractionResult> {
  let html: string;
  let responseUrl: string;

  // 1. Fetch the URL
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return errorResult(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/") && !contentType.includes("html") && !contentType.includes("xml")) {
      return errorResult(`Unsupported content type: ${contentType}`);
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
      return errorResult(`Response too large: ${contentLength} bytes`);
    }

    html = await response.text();
    if (html.length > MAX_RESPONSE_BYTES) {
      html = html.slice(0, MAX_RESPONSE_BYTES);
    }
    responseUrl = response.url || url;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    return errorResult(`Fetch failed: ${message}`);
  }

  try {
    // 2. Parse HTML with linkedom
    const { document } = parseHTML(html);

    // 3. Extract origin for resolving relative URLs
    let origin: string;
    try {
      const parsed = new URL(responseUrl);
      origin = parsed.origin;
    } catch {
      origin = new URL(url).origin;
    }

    // 4. Extract favicon
    const favicon = extractFavicon(document, origin);

    // 5. Configure Turndown
    const turndown = createTurndownService();

    // 6. Try Readability first
    // Clone the document for Readability since it mutates the DOM
    const { document: clonedDoc } = parseHTML(html);
    const reader = new Readability(clonedDoc as unknown as Document);
    const article = reader.parse();

    let title: string | null = null;
    let markdown: string | null = null;
    let contentSource: string;

    if (article && article.content && article.content.trim().length > 0) {
      // Readability succeeded
      title = article.title || extractTitle(document);
      markdown = turndown.turndown(article.content);
      contentSource = "readability";
    } else {
      // Fallback: convert full body
      title = extractTitle(document);
      const body = document.querySelector("body");
      if (body) {
        markdown = turndown.turndown(body.innerHTML || "");
      } else {
        markdown = turndown.turndown(html);
      }
      contentSource = "raw";
    }

    // Trim the markdown
    markdown = markdown ? markdown.trim() : null;

    const contentSize = markdown
      ? new TextEncoder().encode(markdown).length
      : 0;

    return {
      title: title || null,
      favicon,
      markdown,
      contentSource,
      contentSize,
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown extraction error";
    return errorResult(`Extraction failed: ${message}`);
  }
}

/**
 * Build the structured content JSON (schema version 2).
 */
export function buildContentJson(
  markdown: string,
  title: string | null,
  sourceUrl: string
): ContentJson {
  return {
    schemaVersion: 2,
    items: {
      content: {
        format: "markdown",
        markdown,
        meta: {
          title: title || undefined,
          source: sourceUrl,
          content_type: "article",
        },
      },
    },
  };
}

/**
 * Extract favicon URL from HTML document.
 */
function extractFavicon(
  document: ReturnType<typeof parseHTML>["document"],
  origin: string
): string | null {
  // Look for explicit favicon links
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ];

  for (const selector of selectors) {
    const link = document.querySelector(selector);
    if (link) {
      const href = link.getAttribute("href");
      if (href) {
        return resolveUrl(href, origin);
      }
    }
  }

  // Fallback to /favicon.ico
  return `${origin}/favicon.ico`;
}

/**
 * Extract page title from document.
 */
function extractTitle(
  document: ReturnType<typeof parseHTML>["document"]
): string | null {
  // Try <title> tag
  const titleEl = document.querySelector("title");
  if (titleEl?.textContent?.trim()) {
    return titleEl.textContent.trim();
  }

  // Try og:title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute("content");
    if (content?.trim()) return content.trim();
  }

  // Try h1
  const h1 = document.querySelector("h1");
  if (h1?.textContent?.trim()) {
    return h1.textContent.trim();
  }

  return null;
}

/**
 * Resolve a potentially relative URL against an origin.
 */
function resolveUrl(href: string, origin: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  if (href.startsWith("//")) {
    return `https:${href}`;
  }
  if (href.startsWith("/")) {
    return `${origin}${href}`;
  }
  return `${origin}/${href}`;
}

/**
 * Create and configure the Turndown service.
 */
function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });

  // Remove non-content elements
  turndown.remove([
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "aside",
    "noscript",
    "iframe",
    "form",
    "button",
    "input",
    "select",
    "textarea",
  ]);

  return turndown;
}

/**
 * Return an error result with null content fields.
 */
function errorResult(error: string): ExtractionResult {
  return {
    title: null,
    favicon: null,
    markdown: null,
    contentSource: "raw",
    contentSize: 0,
    error,
  };
}
