"use client";

import { Archive, Flag, Trash2, ExternalLink } from "lucide-react";
import type { ItemResponse } from "@/types";

interface ItemCardProps {
  item: ItemResponse;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onFlag: (id: string) => void;
  onClick: (id: string) => void;
}

function relativeTime(timestamp: number | string): string {
  const now = Date.now();
  const then = typeof timestamp === "number" ? timestamp * 1000 : new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function truncateUrl(url: string, maxLength: number = 60): string {
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + parsed.pathname;
    if (display.length > maxLength) {
      return display.slice(0, maxLength - 1) + "\u2026";
    }
    return display;
  } catch {
    if (url.length > maxLength) return url.slice(0, maxLength - 1) + "\u2026";
    return url;
  }
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    stashed: "bg-blue-400",
    flagged: "bg-amber-400",
    archived: "bg-neutral-400",
  };
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${colors[status] ?? "bg-neutral-400"}`}
      title={status}
    />
  );
}

export function ItemCard({
  item,
  onArchive,
  onDelete,
  onFlag,
  onClick,
}: ItemCardProps) {
  return (
    <div
      className="
        group flex items-start gap-3 rounded-lg border border-border
        bg-white p-4 transition-all duration-150
        hover:border-neutral-300 hover:shadow-sm cursor-pointer
      "
      onClick={() => onClick(item.id)}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 mt-0.5">
        {item.favicon ? (
          <img
            src={item.favicon}
            alt=""
            className="h-5 w-5 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center">
            <span className="text-[10px] font-mono text-muted">
              {item.url ? new URL(item.url).hostname.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <StatusDot status={item.status} />
          <h3 className="font-mono text-sm font-medium text-foreground truncate">
            {item.title || truncateUrl(item.url)}
          </h3>
        </div>

        <p className="text-xs text-muted truncate mb-1.5 font-mono">
          {truncateUrl(item.url)}
        </p>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes preview */}
        {item.notes && (
          <p className="text-xs text-muted line-clamp-1 mt-1">
            {item.notes}
          </p>
        )}

        {/* Time */}
        <p className="text-[11px] text-muted/70 mt-1.5 font-mono">
          {relativeTime(item.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Open original"
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.url, "_blank", "noopener");
          }}
          className="rounded p-1.5 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={item.status === "flagged" ? "Unflag" : "Flag"}
          onClick={(e) => {
            e.stopPropagation();
            onFlag(item.id);
          }}
          className={`rounded p-1.5 transition-colors ${
            item.status === "flagged"
              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
              : "text-muted hover:text-amber-500 hover:bg-amber-50"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Archive"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(item.id);
          }}
          className="rounded p-1.5 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="rounded p-1.5 text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
