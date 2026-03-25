"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { useCallback } from "react";

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 bg-nav-bg border-b border-neutral-800">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 sm:px-6 h-14">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="font-mono text-lg font-bold text-white tracking-tight flex-shrink-0"
          >
            keepmark
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <SearchBar
              defaultValue={searchParams.get("q") ?? ""}
              onSearch={handleSearch}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-neutral-500 font-mono hidden md:block">
              {userEmail}
            </span>
            <Link
              href="/settings"
              className="rounded-md p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <SearchBar
            defaultValue={searchParams.get("q") ?? ""}
            onSearch={handleSearch}
          />
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
