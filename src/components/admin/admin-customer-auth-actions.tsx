"use client";

import { useState } from "react";

type Props = {
  userId?: string | null;
  phone?: string | null;
};

export function AdminCustomerAuthActions({ userId, phone }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string, url: string, body: Record<string, unknown>) {
    setLoading(action);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok) {
        throw new Error(data.error ?? "Action failed");
      }
      setMessage(
        action === "pin-reset"
          ? "PIN reset OTP WhatsApp par bhej diya gaya (agar number registered hai)."
          : action === "logout"
            ? "Customer sessions invalidate ho gaye."
            : "Account status update ho gaya.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  if (!userId && !phone) {
    return <p className="text-sm text-slate-500">No linked auth profile for security actions.</p>;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">Auth &amp; security</h3>
      <p className="text-xs text-slate-500">Admin PIN dekh nahi sakta. PIN reset OTP WhatsApp se customer set karega.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!loading}
          className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          onClick={() =>
            run("pin-reset", "/api/admin/customers/send-pin-reset", {
              customerUserId: userId || undefined,
              phone: phone || undefined,
            })
          }
        >
          {loading === "pin-reset" ? "Sending…" : "Send PIN reset OTP"}
        </button>
        {userId ? (
          <>
            <button
              type="button"
              disabled={!!loading}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
              onClick={() => run("logout", "/api/admin/customers/logout-sessions", { userId })}
            >
              {loading === "logout" ? "Working…" : "Logout all devices"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              className="rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
              onClick={() =>
                run("block", "/api/admin/customers/update-status", { userId, accountStatus: "blocked" })
              }
            >
              {loading === "block" ? "Working…" : "Block"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
              onClick={() =>
                run("unblock", "/api/admin/customers/update-status", { userId, accountStatus: "active" })
              }
            >
              {loading === "unblock" ? "Working…" : "Unblock"}
            </button>
          </>
        ) : null}
      </div>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
