"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import {
  ArrowLeft,
  ExternalLink,
  Download,
  CheckCircle2,
  Pencil,
  X,
  Save,
  Loader2,
  Type,
} from "lucide-react";

interface ReadViewItem {
  id: string;
  url: string;
  title: string | null;
  favicon: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  contentMarkdown: string | null;
  contentAvailable: boolean;
  createdAt: string;
  processedAt: string | null;
}

interface ReadViewProps {
  item: ReadViewItem;
}

const TEXT_SIZES = [
  { label: "XS", value: 13 },
  { label: "S", value: 14 },
  { label: "M", value: 16 },
  { label: "L", value: 18 },
  { label: "XL", value: 19 },
  { label: "2XL", value: 20 },
] as const;

function getStoredTextSize(): number {
  if (typeof window === "undefined") return 16;
  const stored = localStorage.getItem("km_text_size");
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (TEXT_SIZES.some((s) => s.value === parsed)) return parsed;
  }
  return 16;
}

export function ReadView({ item }: ReadViewProps) {
  const router = useRouter();

  // Text size
  const [textSize, setTextSize] = useState(16);
  const [showSizeSelector, setShowSizeSelector] = useState(false);

  useEffect(() => {
    setTextSize(getStoredTextSize());
  }, []);

  const handleTextSize = useCallback((size: number) => {
    setTextSize(size);
    localStorage.setItem("km_text_size", String(size));
  }, []);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title ?? "");
  const [editNotes, setEditNotes] = useState(item.notes ?? "");
  const [editTags, setEditTags] = useState(item.tags.join(", "));
  const [saving, setSaving] = useState(false);

  // Processing state
  const [processed, setProcessed] = useState(!!item.processedAt);
  const [processing, setProcessing] = useState(false);

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await fetch(`/api/items/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editTitle || null,
          notes: editNotes || null,
          tags,
        }),
      });
      setEditing(false);
      router.refresh();
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [item.id, editTitle, editNotes, editTags, router]);

  const handleMarkProcessed = useCallback(async () => {
    setProcessing(true);
    try {
      await fetch("/api/items/mark-processed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [item.id] }),
      });
      setProcessed(true);
    } catch {
      alert("Failed to mark as processed.");
    } finally {
      setProcessing(false);
    }
  }, [item.id]);

  const handleDownload = useCallback(() => {
    if (!item.contentMarkdown) return;

    const filename = (item.title ?? "bookmark")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const blob = new Blob([item.contentMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [item.contentMarkdown, item.title]);

  const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 sm:px-6 h-14">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors font-mono"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2">
            {/* Text size selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSizeSelector((prev) => !prev)}
                className="rounded-md p-2 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
                title="Text size"
              >
                <Type className="h-4 w-4" />
              </button>
              {showSizeSelector && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-2 flex items-center gap-1 z-10">
                  {TEXT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => {
                        handleTextSize(size.value);
                        setShowSizeSelector(false);
                      }}
                      className={`
                        rounded px-2 py-1 text-xs font-mono transition-colors
                        ${
                          textSize === size.value
                            ? "bg-foreground text-white"
                            : "text-muted hover:text-foreground hover:bg-neutral-100"
                        }
                      `}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-2 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* Download button */}
            {item.contentMarkdown && (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md p-2 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
                title="Download .md"
              >
                <Download className="h-4 w-4" />
              </button>
            )}

            {/* External link */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-2 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
              title="Open original"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Edit modal/form */}
        {editing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg bg-white rounded-xl border border-border shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-base font-semibold text-foreground">
                  Edit Bookmark
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md p-1.5 text-muted hover:text-foreground hover:bg-neutral-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="
                      w-full rounded-lg border border-border bg-white
                      py-2.5 px-3 text-sm text-foreground
                      focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30
                      transition-colors
                    "
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="
                      w-full rounded-lg border border-border bg-white
                      py-2.5 px-3 text-sm text-foreground resize-y
                      focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30
                      transition-colors
                    "
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="comma-separated tags"
                    className="
                      w-full rounded-lg border border-border bg-white
                      py-2.5 px-3 text-sm text-foreground font-mono
                      placeholder:text-neutral-400
                      focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30
                      transition-colors
                    "
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-mono text-foreground hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="
                    inline-flex items-center gap-2 rounded-lg bg-foreground text-white
                    px-4 py-2 text-sm font-mono font-medium
                    hover:bg-neutral-800 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="font-mono text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-4">
          {item.title || "Untitled"}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted font-mono mb-2">
          <span>{formattedDate}</span>
          <span className="text-border">|</span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors truncate max-w-md"
          >
            {item.url}
          </a>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-mono text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
            <p className="text-sm text-amber-800">{item.notes}</p>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
          {!processed ? (
            <button
              type="button"
              onClick={handleMarkProcessed}
              disabled={processing}
              className="
                inline-flex items-center gap-2 rounded-lg border border-border
                bg-white px-4 py-2 text-xs font-mono text-foreground
                hover:bg-neutral-50 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Mark as processed
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Processed
            </span>
          )}
        </div>

        {/* Markdown content */}
        {item.contentAvailable && item.contentMarkdown ? (
          <article
            className="prose-reader font-reader"
            style={{ fontSize: `${textSize}px` }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
            >
              {item.contentMarkdown}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-muted font-mono">
              No content extracted for this bookmark.
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2 mt-4 rounded-lg border border-border
                px-4 py-2 text-sm font-mono text-foreground
                hover:bg-neutral-50 transition-colors
              "
            >
              <ExternalLink className="h-4 w-4" />
              Visit original
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
