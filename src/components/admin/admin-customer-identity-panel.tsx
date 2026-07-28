"use client";

import { useState } from "react";

import type { CustomerIdentityHealth } from "@/lib/auth/customer-identity-health";

export function AdminCustomerIdentityPanel({
  health,
  mobile,
}: {
  health: CustomerIdentityHealth;
  mobile?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runRepair() {
    if (!mobile) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/customers/repair-pin-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        repaired?: boolean;
        customerId?: string;
      };
      if (!response.ok) throw new Error(data.error || "Repair failed");
      setMessage(
        data.repaired
          ? `Identity repaired. Customer ID ${data.customerId}. Ask customer to use Forgot/Create PIN.`
          : `Identity already linked. Customer ID ${data.customerId}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setLoading(false);
    }
  }

  const statusClass =
    health.status === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : health.status === "repairable"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : health.status === "blocked"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${statusClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">Customer identity health</h2>
          <p className="mt-1 text-xs font-semibold capitalize">Status: {health.status}</p>
        </div>
        {health.status === "repairable" && mobile ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void runRepair()}
            className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Repairing…" : "Repair PIN identity"}
          </button>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Customer ID</dt>
          <dd className="font-mono text-xs">{health.customerId || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Normalized mobile</dt>
          <dd className="font-mono text-xs">{health.normalizedMobile || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Auth user linked</dt>
          <dd className="font-semibold">{health.authUserLinked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Profile linked</dt>
          <dd className="font-semibold">{health.profileLinked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Role</dt>
          <dd className="font-semibold">{health.role || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">PIN configured</dt>
          <dd className="font-semibold">{health.pinConfigured ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Wallet linked</dt>
          <dd className="font-semibold">{health.walletLinked ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Applications</dt>
          <dd className="font-semibold">{health.applicationsCount}</dd>
        </div>
      </dl>

      {health.duplicateIdentityWarning ? (
        <p className="mt-3 text-xs font-semibold text-rose-700">Duplicate identity warning — do not auto-merge.</p>
      ) : null}

      {health.notes.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
          {health.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="mt-3 text-xs font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
