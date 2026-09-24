import Link from "next/link";
import { UserPlus2 } from "lucide-react";

import { formatCount, formatINR } from "@/lib/ap/format";
import type { PartnerTeamSummary } from "@/lib/ap/home-types";

type TeamPanelProps = {
  summary: PartnerTeamSummary;
};

/**
 * A Company Partner's team, at a glance.
 *
 * Team collection and team commission are deliberately not repeated here: the
 * earnings panel above already shows them behind its Mine/Team toggle, so this
 * panel sticks to headcount and volume.
 */
export function TeamPanel({ summary }: TeamPanelProps) {
  const tiles = [
    { label: "Members", value: formatCount(summary.totalMembers) },
    { label: "Active", value: formatCount(summary.activeMembers) },
    { label: "Applications", value: formatCount(summary.teamApplications) },
    {
      label: "Average per member",
      value:
        summary.totalMembers > 0
          ? formatINR(Math.round(summary.teamCollection / summary.totalMembers))
          : formatINR(0),
    },
  ];

  return (
    <section aria-label="Team" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Team</h2>
        <Link href="/ap/team" className="text-xs font-bold text-[#1268e8] hover:underline">
          Manage team
        </Link>
      </div>

      <div className="rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tile.label}</dt>
              <dd className="mt-1 truncate text-base font-bold tabular-nums tracking-tight text-slate-950">
                {tile.value}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          href="/ap/team/new"
          className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
        >
          <UserPlus2 className="h-3.5 w-3.5" aria-hidden />
          Add a member
        </Link>
      </div>
    </section>
  );
}
