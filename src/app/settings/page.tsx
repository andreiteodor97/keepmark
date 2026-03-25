"use client";

import { useState, useEffect, useCallback } from "react";
import { Key, Copy, Check, RefreshCw, Loader2, AlertTriangle, User } from "lucide-react";

interface UserInfo {
  email: string;
  plan: string;
  linkLimit: number;
  linkCount: number;
  linkCountMonth: number;
  linkCountLifetime: number;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // API Key state
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch user info
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Check if API key exists (we infer from user data; no separate endpoint needed)
  // For simplicity, we track this in local state after generation

  const handleGenerateApiKey = useCallback(async () => {
    const confirmed = hasApiKey
      ? confirm(
          "This will invalidate your existing API key. Any integrations using the old key will stop working. Continue?"
        )
      : true;

    if (!confirmed) return;

    setGeneratingKey(true);
    setApiKey("");

    try {
      const res = await fetch("/api/auth/api-key", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to generate API key");
      }

      const data = await res.json();
      setApiKey(data.key);
      setHasApiKey(true);
    } catch {
      alert("Failed to generate API key. Please try again.");
    } finally {
      setGeneratingKey(false);
    }
  }, [hasApiKey]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Manage your account and API access.
        </p>
      </div>

      {/* Account section */}
      <section className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
            <User className="h-4.5 w-4.5 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-base font-semibold text-foreground">
              Account
            </h2>
            <p className="text-xs text-muted">Your account details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Email</span>
            <span className="text-sm font-mono text-foreground">
              {user?.email}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Plan</span>
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-mono font-medium text-foreground capitalize">
              {user?.plan ?? "free"}
            </span>
          </div>
        </div>
      </section>

      {/* API Key section */}
      <section className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
            <Key className="h-4.5 w-4.5 text-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-base font-semibold text-foreground">
              API Key
            </h2>
            <p className="text-xs text-muted">
              Authenticate API requests with a Bearer token
            </p>
          </div>
        </div>

        {apiKey ? (
          <div className="space-y-3">
            <p className="text-xs text-amber-600 font-medium">
              Copy your API key now. It won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-neutral-950 text-green-400 px-4 py-3 text-sm font-mono break-all">
                {apiKey}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="
                  flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg
                  border border-border bg-white px-3 py-2.5 text-xs font-mono
                  text-foreground hover:bg-neutral-50 transition-colors
                "
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {hasApiKey && (
              <p className="text-xs text-muted mb-3">
                An API key already exists for this account.
              </p>
            )}
            <button
              type="button"
              onClick={handleGenerateApiKey}
              disabled={generatingKey}
              className="
                inline-flex items-center gap-2 rounded-lg bg-foreground text-white
                px-4 py-2.5 text-sm font-mono font-medium
                hover:bg-neutral-800 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {generatingKey ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasApiKey ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {hasApiKey ? "Regenerate API Key" : "Generate API Key"}
            </button>
          </div>
        )}
      </section>

      {/* Usage section */}
      <section className="rounded-xl border border-border bg-white p-6">
        <h2 className="font-mono text-base font-semibold text-foreground mb-6">
          Usage
        </h2>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Links this month</span>
              <span className="text-sm font-mono text-foreground">
                {user?.linkCountMonth ?? 0} / {user?.linkLimit ?? 50}
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((user?.linkCountMonth ?? 0) / (user?.linkLimit ?? 50)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Total links saved</span>
            <span className="text-sm font-mono text-foreground">
              {user?.linkCountLifetime ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted">Plan limit</span>
            <span className="text-sm font-mono text-foreground">
              {user?.linkLimit ?? 50} links/month
            </span>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-red-200 bg-red-50/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="font-mono text-base font-semibold text-red-700">
            Danger Zone
          </h2>
        </div>
        <p className="text-sm text-red-600/80 mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          type="button"
          className="
            inline-flex items-center gap-2 rounded-lg border border-red-300
            bg-white px-4 py-2.5 text-sm font-mono font-medium text-red-600
            hover:bg-red-50 transition-colors
          "
          onClick={() =>
            alert(
              "Account deletion is not yet implemented. Please contact support."
            )
          }
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
