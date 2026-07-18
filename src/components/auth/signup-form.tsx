"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, mobile, password }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    router.push("/login?verified=pending");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Full name
        <input
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
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
      <label className="block text-sm">
        Mobile
        <input
          required
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Creating…" : "Sign up"}
      </button>
    </form>
  );
}
