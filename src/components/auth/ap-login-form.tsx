"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/ap/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    router.refresh();
    router.push(data.redirectTo || "/ap/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Username
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          autoComplete="username"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
        {loading ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
