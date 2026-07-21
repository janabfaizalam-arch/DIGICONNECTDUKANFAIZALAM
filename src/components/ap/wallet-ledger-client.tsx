"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { EmptyState, GlassPanel, StatusBadge } from "@/components/ap/ui";
import { isWalletCredit, isWalletDebit } from "@/lib/ap/finance";
import { formatINR } from "@/lib/ap/format";
import { AP_WALLET_ENTRY_TYPE_LABELS, type APWalletEntry, type APWalletEntryType } from "@/lib/ap-types";
import { cn } from "@/lib/utils";

type Props = {
  ledger: APWalletEntry[];
};

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function WalletLedgerClient({ ledger }: Props) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"all" | "credit" | "debit">("all");
  const [entryType, setEntryType] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.filter((row) => {
      if (direction === "credit" && !isWalletCredit(row.entry_type)) return false;
      if (direction === "debit" && !isWalletDebit(row.entry_type)) return false;
      if (entryType !== "all" && row.entry_type !== entryType) return false;
      if (fromDate && row.created_at < `${fromDate}T00:00:00`) return false;
      if (toDate && row.created_at > `${toDate}T23:59:59.999`) return false;
      if (!q) return true;
      const haystack = [
        row.description,
        row.entry_type,
        row.reference_id,
        row.reference_type,
        AP_WALLET_ENTRY_TYPE_LABELS[row.entry_type],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [ledger, query, direction, entryType, fromDate, toDate]);

  const entryTypes = useMemo(
    () => Array.from(new Set(ledger.map((l) => l.entry_type))).sort(),
    [ledger],
  );

  return (
    <section aria-labelledby="wallet-ledger-heading" className="space-y-3">
      <h2 id="wallet-ledger-heading" className="text-sm font-extrabold text-slate-900">
        Transaction ledger
      </h2>

      <GlassPanel padding="md" className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description or reference…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Direction
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "all" | "credit" | "debit")}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Type
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All types</option>
              {entryTypes.map((type) => (
                <option key={type} value={type}>
                  {AP_WALLET_ENTRY_TYPE_LABELS[type as APWalletEntryType] ?? type}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-500">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              To
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>
      </GlassPanel>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching transactions"
          description={
            ledger.length === 0
              ? "Wallet credits and settlements will appear here after eligible activity."
              : "Try clearing search or filters to see more ledger rows."
          }
          actionLabel="View commissions"
          actionHref="/ap/commissions"
        />
      ) : (
        <>
          <GlassPanel padding="none" className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Wallet ledger transactions</caption>
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const credit = isWalletCredit(row.entry_type);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="max-w-[240px] px-4 py-3 font-semibold text-slate-800">
                        <span className="line-clamp-2">{row.description || AP_WALLET_ENTRY_TYPE_LABELS[row.entry_type]}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {row.reference_id ? row.reference_id.slice(0, 12) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={credit ? "approved" : "pending"} label={credit ? "Credit" : "Debit"} />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-extrabold tabular-nums",
                          credit ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        <span className="sr-only">{credit ? "Credit" : "Debit"} </span>
                        {credit ? "+" : "−"}
                        {formatINR(Math.abs(Number(row.amount)))}
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-slate-800">
                        {formatINR(row.running_balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlassPanel>

          <div className="grid gap-2.5 lg:hidden">
            {filtered.map((row) => {
              const credit = isWalletCredit(row.entry_type);
              return (
                <GlassPanel key={row.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {row.description || AP_WALLET_ENTRY_TYPE_LABELS[row.entry_type]}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{formatDateTime(row.created_at)}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-extrabold tabular-nums", credit ? "text-emerald-600" : "text-rose-600")}>
                      {credit ? "+" : "−"}
                      {formatINR(Math.abs(Number(row.amount)))}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <StatusBadge status={credit ? "approved" : "pending"} label={credit ? "Credit" : "Debit"} />
                    <span>Bal {formatINR(row.running_balance)}</span>
                    {row.reference_id ? <span className="font-mono">Ref {row.reference_id.slice(0, 10)}</span> : null}
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
