"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, Inbox } from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { TagPill } from "@/components/tag-pill";
import type { ItemResponse, TagResponse } from "@/types";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Stashed", value: "stashed" },
  { label: "Flagged", value: "flagged" },
  { label: "Archived", value: "archived" },
] as const;

const PAGE_SIZE = 30;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Save bar state
  const [saveUrl, setSaveUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTag, setActiveTag] = useState("");

  // Data
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchQuery = searchParams.get("q") ?? "";

  // Fetch tags
  useEffect(() => {
    fetch("/api/tags", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => {});
  }, []);

  // Fetch items
  const fetchItems = useCallback(
    async (reset: boolean = true) => {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", reset ? "0" : String(offset + PAGE_SIZE));

      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (activeTag) {
        params.set("tags", activeTag);
      }

      let url: string;
      if (searchQuery) {
        params.set("q", searchQuery);
        url = `/api/items/search?${params.toString()}`;
      } else {
        url = `/api/items?${params.toString()}`;
      }

      try {
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();

        if (reset) {
          setItems(data.items ?? []);
        } else {
          setItems((prev) => [...prev, ...(data.items ?? [])]);
          setOffset((prev) => prev + PAGE_SIZE);
        }
        setTotalCount(data.count ?? 0);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, activeTag, searchQuery, offset]
  );

  useEffect(() => {
    fetchItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, activeTag, searchQuery]);

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveUrl.trim();
    if (!trimmed) return;

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to save");
      }

      setSaveUrl("");
      fetchItems(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Action handlers
  const handleArchive = useCallback(
    async (id: string) => {
      await fetch("/api/items/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [id] }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => prev - 1);
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this bookmark?")) return;
      await fetch("/api/items/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [id] }),
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => prev - 1);
    },
    []
  );

  const handleFlag = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const isFlagged = item.status === "flagged";
      const newStatus = isFlagged ? "stashed" : "flagged";

      // The item update endpoint supports archived: boolean which sets
      // status to "archived" or "stashed". For flagging, we use a direct
      // status update via the general-purpose POST body.
      // Since the API treats archived:false as status="stashed", we handle
      // flagging by toggling and doing an optimistic update.
      await fetch(`/api/items/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
    },
    [items]
  );

  const handleClick = useCallback(
    (id: string) => {
      router.push(`/read/${id}`);
    },
    [router]
  );

  const hasMore = items.length < totalCount;

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <form
        onSubmit={handleSave}
        className="flex items-center gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="url"
            value={saveUrl}
            onChange={(e) => {
              setSaveUrl(e.target.value);
              if (saveError) setSaveError("");
            }}
            placeholder="Paste a URL to save..."
            className="
              w-full rounded-lg border border-border bg-white
              py-2.5 px-4 text-sm text-foreground font-mono
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30
              transition-colors
            "
          />
        </div>
        <button
          type="submit"
          disabled={saving || !saveUrl.trim()}
          className="
            inline-flex items-center gap-2 rounded-lg bg-foreground text-white
            px-5 py-2.5 text-sm font-mono font-medium
            hover:bg-neutral-800 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex-shrink-0
          "
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Save
        </button>
      </form>

      {saveError && (
        <p className="text-xs text-red-500 font-mono -mt-4">{saveError}</p>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`
                rounded-md px-3 py-1.5 text-xs font-mono transition-colors
                ${
                  statusFilter === tab.value
                    ? "bg-foreground text-white"
                    : "text-muted hover:text-foreground hover:bg-neutral-50"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tag pills */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <TagPill
                key={tag.slug}
                name={tag.name}
                slug={tag.slug}
                active={activeTag === tag.slug}
                onClick={(slug) =>
                  setActiveTag((prev) => (prev === slug ? "" : slug))
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Item list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-muted animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="font-mono text-base font-medium text-foreground mb-1">
            {searchQuery ? "No results found" : "No bookmarks yet"}
          </h3>
          <p className="text-sm text-muted max-w-xs">
            {searchQuery
              ? "Try a different search query or adjust your filters."
              : "Paste a URL above to save your first bookmark."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onFlag={handleFlag}
              onClick={handleClick}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => fetchItems(false)}
                disabled={loadingMore}
                className="
                  inline-flex items-center gap-2 rounded-lg border border-border
                  bg-white px-5 py-2.5 text-sm font-mono text-foreground
                  hover:bg-neutral-50 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Load more
              </button>
            </div>
          )}

          {/* Count */}
          <p className="text-center text-xs text-muted font-mono pt-2">
            Showing {items.length} of {totalCount} bookmarks
          </p>
        </div>
      )}
    </div>
  );
}
