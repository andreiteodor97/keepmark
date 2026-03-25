"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  defaultValue?: string;
  onSearch: (query: string) => void;
}

export function SearchBar({ defaultValue = "", onSearch }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(value.trim());
    },
    [value, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setValue("");
        onSearch("");
      }
    },
    [onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search bookmarks... (tag:name, in:collection)"
        className="
          w-full rounded-lg bg-neutral-800 border border-neutral-700
          py-2 pl-9 pr-4 text-sm text-white placeholder:text-neutral-500
          font-mono
          focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500
          transition-colors
        "
      />
    </form>
  );
}
