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
        <h2 className="dcp-h2">Team</h2>
        <Link href="/ap/team" className="text-[11.5px] font-bold text-[var(--dcp-brand)] hover:underline">
          Manage team
        </Link>
      </div>

      <div className="dcp-card p-3.5">
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="dcp-inset relative overflow-hidden py-2 pl-3 pr-2.5">
              <span
                aria-hidden
                className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--dcp-brand)]"
              />
              <dt className="text-[9.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[var(--dcp-ink-4)]">
                {tile.label}
              </dt>
              <dd className="mt-0.5 truncate text-[17px] font-bold tabular-nums leading-none tracking-tight text-[var(--dcp-ink)]">
                {tile.value}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          href="/ap/team/new"
          className="mt-3.5 dcp-btn dcp-btn-quiet"
        >
          <UserPlus2 className="h-3.5 w-3.5" aria-hidden />
          Add a member
        </Link>
      </div>
    </section>
  );
}
