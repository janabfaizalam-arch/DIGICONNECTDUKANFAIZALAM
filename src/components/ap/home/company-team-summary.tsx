import Link from "next/link";
import { UserPlus2, Users } from "lucide-react";

import { formatINR } from "@/lib/ap/format";
import type { PartnerTeamSummary } from "@/lib/ap/home-types";

type CompanyTeamSummaryProps = {
  summary: PartnerTeamSummary;
};

export function CompanyTeamSummary({ summary }: CompanyTeamSummaryProps) {
  const tiles = [
    { label: "Total Team Members", value: String(summary.totalMembers) },
    { label: "Active Members", value: String(summary.activeMembers) },
    { label: "Team Applications", value: String(summary.teamApplications) },
    { label: "Team Collection", value: formatINR(summary.teamCollection) },
    { label: "Team Commission", value: formatINR(summary.teamCommission) },
  ];

  return (
    <section aria-label="Team" className="space-y-3 px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-blue-700" aria-hidden />
        <h2 className="text-sm font-extrabold text-slate-900">Team</h2>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tile.label}</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-slate-950">{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/ap/team"
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
          >
            View Team
          </Link>
          <Link
            href="/ap/team/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:border-blue-300"
          >
            <UserPlus2 className="h-3.5 w-3.5" aria-hidden />
            Add Team Member
          </Link>
        </div>
      </div>
    </section>
  );
}
