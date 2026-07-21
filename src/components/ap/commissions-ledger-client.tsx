"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState, GlassPanel, StatusBadge } from "@/components/ap/ui";
import { formatINR } from "@/lib/ap/format";
import { AP_COMMISSION_STATUS_LABELS, type APCommission, type APCommissionStatus } from "@/lib/ap-types";

type Props = {
  commissions: APCommission[];
};

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function customerName(row: APCommission): string {
  const fromJoin = row.application
    ? String((row.application as { customer_name?: string | null }).customer_name ?? "").trim()
    : "";
  return fromJoin || "—";
}

export function CommissionsLedgerClient({ commissions }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commissions.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      const customer = customerName(row);
      const haystack = [
        row.service_name,
        row.service_slug,
        row.application_id,
        row.payout_id,
        row.status,
        customer,
        AP_COMMISSION_STATUS_LABELS[row.status],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [commissions, query, status]);

  const statuses = useMemo(
    () => Array.from(new Set(commissions.map((c) => c.status))).sort(),
    [commissions],
  );

  return (
    <section aria-labelledby="commission-ledger-heading" className="space-y-3">
      <h2 id="commission-ledger-heading" className="text-sm font-extrabold text-slate-900">
        Commission ledger
      </h2>

      <GlassPanel padding="md" className="grid gap-2 sm:grid-cols-3">
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search commissions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search service, application or payout reference…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="text-xs font-bold text-slate-500">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {AP_COMMISSION_STATUS_LABELS[s as APCommissionStatus] ?? s}
              </option>
            ))}
          </select>
        </label>
      </GlassPanel>

      {filtered.length === 0 ? (
        <EmptyState
          title="No commission activity yet"
          description="Completed eligible applications will appear here."
          actionLabel="View applications"
          actionHref="/ap/applications"
        />
      ) : (
        <>
          <GlassPanel padding="none" className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">Commission earnings ledger</caption>
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Earned</th>
                  <th className="px-4 py-3">Settled</th>
                  <th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="max-w-[160px] truncate px-4 py-3 font-semibold text-slate-700">
                      {customerName(row)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.service_name || "Service"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ap/applications/${row.application_id}`}
                        className="font-mono text-[11px] font-bold text-indigo-700 hover:underline"
                      >
                        {row.application_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-extrabold tabular-nums text-slate-900">
                      {formatINR(row.calculated_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} label={AP_COMMISSION_STATUS_LABELS[row.status]} />
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(row.paid_at)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {row.payout_id ? row.payout_id.slice(0, 8).toUpperCase() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>

          <div className="grid gap-2.5 lg:hidden">
            {filtered.map((row) => (
              <GlassPanel key={row.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-900">{customerName(row)}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{row.service_name || "Service"}</p>
                    <Link
                      href={`/ap/applications/${row.application_id}`}
                      className="mt-0.5 inline-block font-mono text-[11px] font-bold text-indigo-700"
                    >
                      {row.application_id.slice(0, 8).toUpperCase()}
                    </Link>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900">
                    {formatINR(row.calculated_amount)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <StatusBadge status={row.status} label={AP_COMMISSION_STATUS_LABELS[row.status]} />
                  <span>Earned {formatDate(row.created_at)}</span>
                  {row.paid_at ? <span>Settled {formatDate(row.paid_at)}</span> : null}
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
