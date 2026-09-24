"use client";

import Link from "next/link";
import { useState } from "react";

import { formatINR } from "@/lib/ap/format";
import type { PartnerCollectionCommission } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type EarningsPanelProps = {
  data: PartnerCollectionCommission;
  showTeamToggle?: boolean;
  className?: string;
};

/**
 * Money that is not already a headline number.
 *
 * Today's collection and total commission live in the KPI row, so they are
 * deliberately absent here: this panel carries the month, what is still owed,
 * and what is still to be paid out. A Company Partner can switch the same four
 * figures to their team's.
 */
export function EarningsPanel({ data, showTeamToggle = false, className }: EarningsPanelProps) {
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const isTeam = showTeamToggle && scope === "team";

  const figures = isTeam
    ? [
        { label: "Team today", value: formatINR(data.teamCollectedToday ?? 0), rail: "var(--dcp-good)" },
        { label: "Team this month", value: formatINR(data.teamMonthCollection ?? 0), rail: "var(--dcp-brand)" },
        { label: "Team commission", value: formatINR(data.teamCommissionEarned ?? 0), rail: "var(--dcp-accent)" },
        { label: "Team pending", value: formatINR(data.teamCommissionPending ?? 0), rail: "var(--dcp-warn)" },
      ]
    : [
        { label: "This month", value: formatINR(data.monthCollection), rail: "var(--dcp-brand)" },
        { label: "Still to collect", value: formatINR(data.pendingCollection), rail: "var(--dcp-warn)" },
        { label: "Commission pending", value: formatINR(data.commissionPending), rail: "var(--dcp-accent)" },
        { label: "Commission earned", value: formatINR(data.commissionEarned), rail: "var(--dcp-good)" },
      ];

  return (
    <section aria-label="Earnings" className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="dcp-h2">Earnings</h2>

        {showTeamToggle ? (
          <div className="inline-flex rounded-[11px] border border-[var(--dcp-line)] bg-[var(--dcp-surface)] p-0.5 shadow-[var(--dcp-e1)]" role="group" aria-label="Earnings scope">
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
                  scope === option.key
                    ? "text-white shadow-[0_5px_14px_-7px_rgba(18,104,232,0.85)] [background-image:var(--dcp-g-brand)]"
                    : "text-[var(--dcp-ink-2)] hover:bg-[var(--dcp-surface-2)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="dcp-card p-3.5">
        {!data.hasCommissionScheme && !isTeam ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            No commission plan is set on your account yet, so commission figures stay at zero.
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label} className="dcp-inset relative overflow-hidden py-2 pl-3 pr-2.5">
              {/* A short rail in the figure's own hue: it anchors the number to
                  the left edge instead of leaving it adrift in a wide tile. */}
              <span
                aria-hidden
                className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                style={{ background: figure.rail }}
              />
              <dt className="text-[9.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[var(--dcp-ink-4)]">
                {figure.label}
              </dt>
              <dd className="mt-0.5 truncate text-[17px] font-bold tabular-nums leading-none tracking-tight text-[var(--dcp-ink)]">
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Link
            href="/ap/payments/collect"
            className="dcp-btn dcp-btn-brand"
          >
            Collect payment
          </Link>
          <Link
            href="/ap/payouts"
            className="dcp-btn dcp-btn-quiet"
          >
            Request payout
          </Link>
          <Link
            href="/ap/commissions"
            className="dcp-btn dcp-btn-quiet"
          >
            Commission ledger
          </Link>
        </div>
      </div>
    </section>
  );
}
