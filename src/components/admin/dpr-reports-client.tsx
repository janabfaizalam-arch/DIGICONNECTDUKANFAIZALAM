"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { DprAnalyticsSummary } from "@/lib/dpr/analytics";
import { dprRowsToCsv } from "@/lib/dpr/analytics";

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: Array<{ count: number; revenue: number } & Record<string, string | number>>;
  labelKey: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div
              key={String(row[labelKey])}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-slate-800 truncate">{String(row[labelKey])}</span>
              <span className="shrink-0 font-bold text-slate-600">
                {row.count} · {money(row.revenue)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No data yet.</p>
        )}
      </div>
    </div>
  );
}

export function DprReportsClient({ analytics }: { analytics: DprAnalyticsSummary }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return analytics.rows;
    return analytics.rows.filter((row) =>
      [row.customerName, row.partnerName, row.scheme, row.state, row.id, row.plan]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [analytics.rows, query]);

  const downloadCsv = () => {
    const csv = dprRowsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dpr-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s apps" value={String(analytics.todayCount)} hint={money(analytics.todayRevenue)} />
        <StatCard label="Total DPR apps" value={String(analytics.totalCount)} hint={money(analytics.totalRevenue)} />
        <StatCard label="Paid apps" value={String(analytics.paidCount)} hint={`${analytics.conversionRate}% conversion`} />
        <StatCard label="Avg ticket" value={money(analytics.totalCount ? analytics.totalRevenue / analytics.totalCount : 0)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownCard title="By scheme" rows={analytics.byScheme} labelKey="scheme" />
        <BreakdownCard title="By state" rows={analytics.byState} labelKey="state" />
        <BreakdownCard title="By partner" rows={analytics.byPartner} labelKey="partner" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">DPR applications</h3>
            <p className="text-xs text-slate-500">Export includes scheme, plan, partner, and payment columns.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, scheme, partner…"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={downloadCsv}
              className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-bold">Customer</th>
                <th className="px-3 py-2 font-bold">Scheme</th>
                <th className="px-3 py-2 font-bold">Partner</th>
                <th className="px-3 py-2 font-bold">Amount</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <Link href={`/admin/applications/${row.id}`} className="font-bold text-blue-700 hover:underline">
                        {row.customerName}
                      </Link>
                      <p className="font-mono text-[10px] text-slate-400">{row.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700">
                      {row.scheme}
                      <p className="text-[10px] capitalize text-slate-400">{row.plan}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.partnerName}
                      {row.partnerCode ? <p className="text-[10px] text-slate-400">{row.partnerCode}</p> : null}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">{money(row.amount)}</td>
                    <td className="px-3 py-2 capitalize text-slate-700">
                      {row.status.replace(/_/g, " ")}
                      <p className="text-[10px] text-slate-400">{row.paymentStatus}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString("en-IN") : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No DPR applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
