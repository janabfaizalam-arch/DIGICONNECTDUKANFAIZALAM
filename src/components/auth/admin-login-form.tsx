"use client";

import { useRef, useState } from "react";

import {
  categorizeAdminLoginFailure,
  type AdminLoginFailure,
} from "@/lib/auth/admin-login-core";

type Mode = "email" | "pin";
type Stage = "idle" | "validating" | "requesting" | "redirecting";

const LOGIN_TIMEOUT_MS = 15_000;

function validate(mode: Mode, values: { email: string; password: string; phone: string; pin: string }): string | null {
  if (mode === "email") {
    const email = values.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Enter a valid email address.";
    }
    if (values.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return null;
  }
  if (!/^[6-9]\d{9}$/.test(values.phone)) {
    return "Enter a valid 10-digit Indian mobile number.";
  }
  if (!/^\d{6}$/.test(values.pin)) {
    return "PIN must be exactly 6 digits.";
  }
  return null;
}

export function AdminLoginForm() {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [failure, setFailure] = useState<AdminLoginFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const submittingRef = useRef(false);

  const isDev = process.env.NODE_ENV === "development";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Ignore repeated submits while a request is in flight.
    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    setFailure(null);
    setStage("validating");
    const startedAt = Date.now();

    try {
      const validationError = validate(mode, { email, password, phone, pin });
      if (validationError) {
        setFailure({ category: "invalid_credentials", message: validationError });
        return;
      }

      const payload =
        mode === "email"
          ? { method: "email" as const, email: email.trim().toLowerCase(), password }
          : { method: "pin" as const, phone, pin };

      // Hard 15s cap: abort the fetch so the button can never hang forever.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

      setStage("requesting");
      let response: Response;
      try {
        response = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: "no-store",
        });
      } catch (fetchError) {
        const aborted =
          controller.signal.aborted ||
          (fetchError instanceof DOMException && fetchError.name === "AbortError");
        setFailure(categorizeAdminLoginFailure({ kind: aborted ? "timeout" : "network" }));
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setFailure(
          categorizeAdminLoginFailure({ kind: "http", status: response.status, message: data.error }),
        );
        return;
      }

      // Full navigation (not router.push) so middleware re-reads the fresh
      // admin cookies and the login page cannot linger in a stale state.
      setStage("redirecting");
      window.location.replace(data.redirectTo || "/admin");
      return;
    } catch {
      setFailure(categorizeAdminLoginFailure({ kind: "http", status: 500, message: null }));
    } finally {
      // Always reset — success, failure, timeout, or unexpected exception.
      // (After location.replace the page unloads anyway; resetting is harmless.)
      submittingRef.current = false;
      setLoading(false);
      setElapsedMs(Date.now() - startedAt);
      setStage((current) => (current === "redirecting" ? current : "idle"));
    }
  }

  function switchMode(next: Mode) {
    if (loading) return;
    setMode(next);
    setFailure(null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => switchMode("email")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${mode === "email" ? "bg-white shadow" : "text-slate-600"}`}
        >
          Email + Password
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => switchMode("pin")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${mode === "pin" ? "bg-white shadow" : "text-slate-600"}`}
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
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="janabfaizalam@gmail.com"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
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
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="7007595931"
                className="w-full px-3 py-2 outline-none disabled:bg-slate-50"
              />
            </div>
          </label>
          <label className="block text-sm">
            6-Digit PIN
            <input
              type="password"
              inputMode="numeric"
              required
              disabled={loading}
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 tracking-widest disabled:bg-slate-50"
            />
          </label>
        </>
      )}

      {failure ? (
        <p role="alert" className="text-sm text-red-700">
          {failure.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        {loading ? (stage === "redirecting" ? "Redirecting…" : "Signing in…") : "Login"}
      </button>

      {isDev ? (
        <p className="text-xs text-slate-400">
          [dev] stage: {stage}
          {elapsedMs !== null ? ` · last request: ${elapsedMs}ms` : ""}
          {failure ? ` · error: ${failure.category}` : ""}
        </p>
      ) : null}
    </form>
  );
}
