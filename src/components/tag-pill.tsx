"use client";

interface TagPillProps {
  name: string;
  slug: string;
  active?: boolean;
  onClick?: (slug: string) => void;
}

export function TagPill({ name, slug, active = false, onClick }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(slug)}
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono
        transition-colors duration-150
        ${
          active
            ? "bg-foreground text-white border border-foreground"
            : "bg-white text-muted border border-border hover:border-foreground/30 hover:text-foreground"
        }
      `}
    >
      {name}
    </button>
  );
}
