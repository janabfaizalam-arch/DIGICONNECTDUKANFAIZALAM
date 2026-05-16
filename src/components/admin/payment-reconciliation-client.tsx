"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Link2, LoaderCircle, RefreshCcw, Search, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import type { ReconciliationRow, SyncResult } from "@/lib/admin-payment-reconciliation";

type PaymentReconciliationClientProps = {
  rows: ReconciliationRow[];
  defaultFrom: string;
  defaultTo: string;
};

type ActionName = "link_to_application" | "mark_application_paid" | "create_missing_payment_row" | "mark_stale_pending_failed";

function dateInputValue(value: string) {
  return value.slice(0, 10);
}

function ResultSummary({ result }: { result: SyncResult | null }) {
  if (!result) return null;

  return (
    <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950 md:grid-cols-3 xl:grid-cols-6">
      <p><span className="font-bold">{result.scanned}</span> scanned</p>
      <p><span className="font-bold">{result.matchedApplications}</span> app matches</p>
      <p><span className="font-bold">{result.matchedPayments}</span> payment matches</p>
      <p><span className="font-bold">{result.createdPayments}</span> rows created</p>
      <p><span className="font-bold">{result.markedApplicationsPaid}</span> apps paid</p>
      <p><span className="font-bold">{result.unmatched}</span> unmatched</p>
    </div>
  );
}

export function PaymentReconciliationClient({ rows, defaultFrom, defaultTo }: PaymentReconciliationClientProps) {
  const router = useRouter();
  const [from, setFrom] = useState(dateInputValue(defaultFrom));
  const [to, setTo] = useState(dateInputValue(defaultTo));
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [applicationIds, setApplicationIds] = useState<Record<string, string>>({});

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) =>
      [
        row.razorpay_payment_id,
        row.razorpay_order_id,
        row.email,
        row.contact,
        row.matched_application_id,
        row.matched_payment_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [query, rows]);

  async function syncPayments() {
    setBusyKey("sync");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/payment-reconciliation/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: new Date(`${from}T00:00:00`).toISOString(),
          to: new Date(`${to}T23:59:59`).toISOString(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Razorpay sync failed.");
      }

      setResult(payload.result as SyncResult);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Razorpay sync failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function runAction(row: ReconciliationRow, action: ActionName) {
    const applicationId = applicationIds[row.razorpay_payment_id]?.trim();

    if (action !== "mark_stale_pending_failed" && !applicationId) {
      setError("Enter an application id before running this action.");
      return;
    }

    setBusyKey(`${row.razorpay_payment_id}:${action}`);
    setError(null);

    try {
      const response = await fetch("/api/admin/payment-reconciliation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          razorpayPaymentId: row.razorpay_payment_id,
          applicationId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Action failed.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            From
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            To
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <Button type="button" className="h-12 rounded-2xl" disabled={busyKey === "sync"} onClick={syncPayments}>
            {busyKey === "sync" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Sync Razorpay Payments
          </Button>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <ResultSummary result={result} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Razorpay Reconciliation Queue</h2>
            <p className="mt-1 text-sm text-slate-500">Captured or authorized Razorpay payments that need CRM review.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Razorpay, email, contact" className="pl-11" />
          </div>
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-100 xl:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Razorpay</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Matched</th>
                <th className="px-4 py-3">Action Needed</th>
                <th className="px-4 py-3">Safe Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => {
                const baseKey = row.razorpay_payment_id;
                const isResolved = Boolean(row.resolved_at);

                return (
                  <tr key={row.id} className="bg-white align-top">
                    <td className="px-4 py-3">
                      <p className="max-w-52 truncate font-mono text-xs font-bold text-slate-900">{row.razorpay_payment_id}</p>
                      <p className="mt-1 max-w-52 truncate font-mono text-[11px] text-slate-500">{row.razorpay_order_id ?? "-"}</p>
                      <p className="mt-2 text-xs text-slate-500">{safeDateTime(row.paid_at ?? row.last_seen_at)}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{safeCurrency(row.amount)}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={isResolved ? "verified" : row.razorpay_status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-slate-700">{row.email ?? "-"}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{row.contact ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.matched_application_id ? (
                        <Link href={`/admin/applications/${row.matched_application_id}`} className="font-mono text-xs font-bold text-blue-700">{row.matched_application_id.slice(0, 8)}</Link>
                      ) : <span className="text-slate-400">No app</span>}
                      <p className="mt-1 font-mono text-[11px] text-slate-500">{row.matched_payment_id?.slice(0, 8) ?? "No payment row"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.action_needed}</td>
                    <td className="px-4 py-3">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Resolved
                        </span>
                      ) : (
                        <div className="grid min-w-72 gap-2">
                          <Input
                            value={applicationIds[baseKey] ?? ""}
                            onChange={(event) => setApplicationIds((current) => ({ ...current, [baseKey]: event.target.value }))}
                            placeholder="Existing application id"
                            className="h-10 rounded-xl font-mono text-xs"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs" disabled={Boolean(busyKey)} onClick={() => runAction(row, "link_to_application")}>
                              {busyKey === `${baseKey}:link_to_application` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                              Link payment
                            </Button>
                            <Button type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs" disabled={Boolean(busyKey)} onClick={() => runAction(row, "create_missing_payment_row")}>
                              Create row
                            </Button>
                            <Button type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs" disabled={Boolean(busyKey)} onClick={() => runAction(row, "mark_application_paid")}>
                              Mark paid
                            </Button>
                          </div>
                          <Link href="/admin/applications" className="text-xs font-bold text-blue-700">
                            Create Application Manually
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 xl:hidden">
          {visibleRows.map((row) => {
            const isResolved = Boolean(row.resolved_at);
            const baseKey = row.razorpay_payment_id;

            return (
              <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-bold text-slate-950">{row.razorpay_payment_id}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{row.razorpay_order_id ?? "-"}</p>
                  </div>
                  <AdminStatusBadge status={isResolved ? "verified" : row.razorpay_status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                  <p><span className="font-bold text-slate-950">Amount:</span> {safeCurrency(row.amount)}</p>
                  <p><span className="font-bold text-slate-950">Contact:</span> {row.email ?? row.contact ?? "-"}</p>
                  <p><span className="font-bold text-slate-950">Action:</span> {row.action_needed}</p>
                </div>
                {!isResolved ? (
                  <div className="mt-4 grid gap-2">
                    <Input
                      value={applicationIds[baseKey] ?? ""}
                      onChange={(event) => setApplicationIds((current) => ({ ...current, [baseKey]: event.target.value }))}
                      placeholder="Existing application id"
                      className="h-10 rounded-xl font-mono text-xs"
                    />
                    <Button type="button" variant="outline" className="rounded-xl" disabled={Boolean(busyKey)} onClick={() => runAction(row, "link_to_application")}>
                      Link to Existing Customer/Application
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
