import Link from "next/link";
import { Briefcase } from "lucide-react";

import type { PartnerHomeRecentCustomer, PartnerOfficeWorkSummary } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";

type OfficeWorkSummaryProps = {
  summary: PartnerOfficeWorkSummary;
  recentCustomers?: PartnerHomeRecentCustomer[];
};

export function OfficeWorkSummary({ summary, recentCustomers = [] }: OfficeWorkSummaryProps) {
  const tiles = [
    { label: "Applications to Process", value: String(summary.applicationsToProcess), href: "/ap/assigned-work" },
    { label: "Support Queue", value: String(summary.supportQueueCount), href: "/ap/support" },
    { label: "Recent Offline Invoices", value: String(summary.recentOfflineInvoices), href: "/ap/invoices/offline" },
    { label: "Assigned Work", value: String(summary.assignedWorkCount), href: "/ap/assigned-work" },
  ];

  return (
    <section aria-label="Office work" className="space-y-3 px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-blue-700" aria-hidden />
        <h2 className="text-sm font-extrabold text-slate-900">Office Work</h2>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-blue-300"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tile.label}</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-slate-950">{tile.value}</p>
            </Link>
          ))}
        </div>
      </div>

      {recentCustomers.length ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent customers</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {recentCustomers.map((customer) => (
              <li key={customer.id}>
                <Link href={customer.href} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm font-semibold text-slate-900">{customer.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{customer.mobile}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <DashboardEmptyState title="No assigned customers" description="Assigned work will appear here." />
      )}
    </section>
  );
}
