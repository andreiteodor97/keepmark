"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-neutral-50">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-mono text-xl font-bold text-foreground mb-2">
              keepmark
            </h1>
            <p className="text-sm text-muted">Sign in to your account</p>
          </div>

          {status === "success" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />
              <h2 className="font-mono text-base font-semibold text-foreground mb-2">
                Check your email
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                We sent a magic link to{" "}
                <span className="font-mono text-foreground">{email}</span>.
                <br />
                Click the link to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-mono font-medium text-foreground mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="
                      w-full rounded-lg border border-border bg-white
                      py-2.5 pl-10 pr-4 text-sm text-foreground
                      placeholder:text-neutral-400
                      focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30
                      transition-colors
                    "
                  />
                </div>
              </div>

              {status === "error" && errorMessage && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="
                  w-full flex items-center justify-center gap-2 rounded-lg
                  bg-foreground text-white py-2.5 text-sm font-mono font-medium
                  hover:bg-neutral-800 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          By signing in, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
