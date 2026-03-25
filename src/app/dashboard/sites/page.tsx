"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Trash2,
  ExternalLink,
  Loader2,
  FolderOpen,
  Lock,
} from "lucide-react";

interface SiteResponse {
  id: string;
  slug: string;
  status: string;
  siteUrl: string;
  metadata: Record<string, unknown>;
  hasPassword: boolean;
  ttl: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: {
    versionNumber: number;
    fileCount: number;
  } | null;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "live":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "deleted":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/publishes", { credentials: "include" });
      const data = await res.json();
      setSites(data.sites ?? []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleCopyUrl = useCallback(async (slug: string, siteUrl: string) => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // Fallback: do nothing
    }
  }, []);

  const handleDelete = useCallback(
    async (slug: string) => {
      if (!confirm(`Delete site "${slug}"? This cannot be undone.`)) return;

      try {
        await fetch(`/api/v1/publish/${slug}`, {
          method: "DELETE",
          credentials: "include",
        });
        setSites((prev) => prev.filter((s) => s.slug !== slug));
      } catch {
        // Silently fail
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-muted animate-spin" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderOpen className="h-12 w-12 text-neutral-300 mb-4" />
        <h3 className="font-mono text-base font-medium text-foreground mb-1">
          No sites yet
        </h3>
        <p className="text-sm text-muted max-w-xs">
          Publish your first site using the CLI or API.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-lg font-semibold text-foreground">
          Sites
        </h2>
        <span className="text-xs text-muted font-mono">
          {sites.length} site{sites.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => {
          const title =
            (site.metadata?.title as string) || "Untitled";

          return (
            <div
              key={site.id}
              className="
                rounded-lg border border-border bg-white p-4
                flex flex-col gap-3
                hover:border-neutral-300 transition-colors
              "
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={site.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      font-mono text-sm font-medium text-foreground
                      hover:underline truncate block
                    "
                  >
                    {site.slug}
                  </a>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {title}
                  </p>
                </div>
                <span
                  className={`
                    flex-shrink-0 rounded-full px-2 py-0.5 text-[10px]
                    font-mono font-medium uppercase tracking-wider
                    ${statusColor(site.status)}
                  `}
                >
                  {site.status}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted font-mono">
                {site.currentVersion && (
                  <span>{site.currentVersion.fileCount} file{site.currentVersion.fileCount !== 1 ? "s" : ""}</span>
                )}
                {site.hasPassword && (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    protected
                  </span>
                )}
                <span className="ml-auto">{relativeTime(site.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 border-t border-border pt-3 -mb-1">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(site.slug, site.siteUrl)}
                  className="
                    inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5
                    text-xs font-mono text-muted
                    hover:text-foreground hover:bg-neutral-50
                    transition-colors
                  "
                  title="Copy URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedSlug === site.slug ? "Copied!" : "Copy"}
                </button>
                <a
                  href={site.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5
                    text-xs font-mono text-muted
                    hover:text-foreground hover:bg-neutral-50
                    transition-colors
                  "
                  title="Open site"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(site.slug)}
                  className="
                    inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5
                    text-xs font-mono text-muted
                    hover:text-red-600 hover:bg-red-50
                    transition-colors ml-auto
                  "
                  title="Delete site"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
