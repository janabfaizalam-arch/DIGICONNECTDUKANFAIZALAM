"use client";

import Link from "next/link";
import { useState } from "react";

import { formatINR } from "@/lib/ap/format";
import type { PartnerCollectionCommission } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type EarningsPanelProps = {
  data: PartnerCollectionCommission;
  showTeamToggle?: boolean;
};

/**
 * Money that is not already a headline number.
 *
 * Today's collection and total commission live in the KPI row, so they are
 * deliberately absent here: this panel carries the month, what is still owed,
 * and what is still to be paid out. A Company Partner can switch the same four
 * figures to their team's.
 */
export function EarningsPanel({ data, showTeamToggle = false }: EarningsPanelProps) {
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const isTeam = showTeamToggle && scope === "team";

  const figures = isTeam
    ? [
        { label: "Team collected today", value: formatINR(data.teamCollectedToday ?? 0) },
        { label: "Team this month", value: formatINR(data.teamMonthCollection ?? 0) },
        { label: "Team commission earned", value: formatINR(data.teamCommissionEarned ?? 0) },
        { label: "Team commission pending", value: formatINR(data.teamCommissionPending ?? 0) },
      ]
    : [
        { label: "This month", value: formatINR(data.monthCollection) },
        { label: "Still to collect", value: formatINR(data.pendingCollection) },
        { label: "Commission pending", value: formatINR(data.commissionPending) },
        { label: "Commission earned", value: formatINR(data.commissionEarned) },
      ];

  return (
    <section aria-label="Earnings" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Earnings</h2>

        {showTeamToggle ? (
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5" role="group" aria-label="Earnings scope">
            {(
              [
                { key: "mine", label: "Mine" },
                { key: "team", label: "Team" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={scope === option.key}
                onClick={() => setScope(option.key)}
                className={cn(
                  "rounded-[10px] px-3 py-1.5 text-[11px] font-bold transition duration-150",
                  scope === option.key ? "bg-[#1268e8] text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {!data.hasCommissionScheme && !isTeam ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            No commission plan is set on your account yet, so commission figures stay at zero.
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label} className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{figure.label}</dt>
              <dd className="mt-1 truncate text-base font-bold tabular-nums tracking-tight text-slate-950">
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Link
            href="/ap/payments/collect"
            className="inline-flex h-10 items-center rounded-xl bg-[#1268e8] px-4 text-xs font-bold text-white transition duration-150 hover:bg-[#0d55c0] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
          >
            Collect payment
          </Link>
          <Link
            href="/ap/payouts"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
          >
            Request payout
          </Link>
          <Link
            href="/ap/commissions"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
          >
            Commission ledger
          </Link>
        </div>
      </div>
    </section>
  );
}
