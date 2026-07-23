"use client";

import Link from "next/link";
import { useState } from "react";

import { formatINR } from "@/lib/ap/format";
import type { PartnerCollectionCommission } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type CollectionCommissionProps = {
  data: PartnerCollectionCommission;
  showTeamToggle?: boolean;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-base font-extrabold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}

export function CollectionCommission({ data, showTeamToggle = false }: CollectionCommissionProps) {
  const [tab, setTab] = useState<"mine" | "team">("mine");

  const isTeam = showTeamToggle && tab === "team";

  const collectedToday = isTeam ? data.teamCollectedToday ?? 0 : data.collectedToday;
  const monthCollection = isTeam ? data.teamMonthCollection ?? 0 : data.monthCollection;
  const pendingCollection = isTeam ? 0 : data.pendingCollection;
  const commissionEarned = isTeam ? data.teamCommissionEarned ?? 0 : data.commissionEarned;
  const commissionPending = isTeam ? data.teamCommissionPending ?? 0 : data.commissionPending;

  return (
    <section aria-label="Collection and commission" className="space-y-3 px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-slate-900">Collection & Commission</h2>
        {showTeamToggle ? (
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition",
                tab === "mine" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              My Earnings
            </button>
            <button
              type="button"
              onClick={() => setTab("team")}
              className={cn(
                "rounded-lg px-3 py-1.5 transition",
                tab === "team" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              Team Earnings
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {!data.hasCommissionScheme && !isTeam ? (
          <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            No commission assigned — balances show as zero until a plan is configured.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Metric label="Collected Today" value={formatINR(collectedToday)} />
          <Metric label="This Month Collection" value={formatINR(monthCollection)} />
          {!isTeam ? <Metric label="Pending Collection" value={formatINR(pendingCollection)} /> : null}
          <Metric label="Commission Earned" value={formatINR(commissionEarned)} />
          <Metric label="Commission Pending" value={formatINR(commissionPending)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/ap/payments/collect"
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
          >
            Collect Payment
          </Link>
          <Link
            href="/ap/commissions"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:border-blue-300"
          >
            View Commission
          </Link>
        </div>
      </div>
    </section>
  );
}
