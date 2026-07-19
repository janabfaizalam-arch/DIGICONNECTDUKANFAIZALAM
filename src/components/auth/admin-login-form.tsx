"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "email" | "pin";

export function AdminLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload =
      mode === "email"
        ? { method: "email" as const, email, password }
        : { method: "pin" as const, phone, pin };

    const response = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };

    if (!response.ok) {
      setError(data.error ?? "Login failed");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(data.redirectTo || "/admin");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("email");
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "email" ? "bg-white shadow" : "text-slate-600"}`}
        >
          Email + Password
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("pin");
            setError(null);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "pin" ? "bg-white shadow" : "text-slate-600"}`}
        >
          Mobile + PIN
        </button>
      </div>

      {mode === "email" ? (
        <>
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="janabfaizalam@gmail.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
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
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm">
            Mobile
            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
              <span className="bg-slate-50 px-3 py-2 text-sm text-slate-600">+91</span>
              <input
                inputMode="numeric"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="7007595931"
                className="w-full px-3 py-2 outline-none"
              />
            </div>
          </label>
          <label className="block text-sm">
            6-Digit PIN
            <input
              type="password"
              inputMode="numeric"
              required
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 tracking-widest"
            />
          </label>
        </>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
        {loading ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
