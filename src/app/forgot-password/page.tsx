"use client";

import { useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Auth is not configured.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("Check your email for a reset link.");
    setLoading(false);
  }

  return (
    <div className="container-narrow py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Forgot password</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-teal-800">{message}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-sm">
          <Link href="/login" className="underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
