import Link from "next/link";

import type { PartnerHomeRecentCustomer, PartnerPendingWorkItem } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";

type StandardOpsFooterProps = {
  recentCustomers: PartnerHomeRecentCustomer[];
  pendingWork: PartnerPendingWorkItem[];
};

/** Shared final section for Business Partner and Field Executive. */
export function StandardOpsFooter({ recentCustomers, pendingWork }: StandardOpsFooterProps) {
  const pendingApps = pendingWork.filter((item) => item.ctaLabel === "Upload Documents" || item.ctaLabel === "Process Now");
  const pendingCollections = pendingWork.filter((item) => item.ctaLabel === "Collect Payment");

  return (
    <section aria-label="Operations snapshot" className="space-y-3 px-4 md:px-6">
      <h2 className="text-sm font-extrabold text-slate-900">Operations</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Customers</p>
          {!recentCustomers.length ? (
            <p className="mt-3 text-xs text-slate-500">No recent customers.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentCustomers.slice(0, 4).map((customer) => (
                <li key={customer.id}>
                  <Link href={customer.href} className="block truncate text-sm font-semibold text-slate-800 hover:text-blue-700">
                    {customer.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Applications</p>
          {!pendingApps.length ? (
            <p className="mt-3 text-xs text-slate-500">No pending applications.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingApps.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="block truncate text-sm font-semibold text-slate-800 hover:text-blue-700">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Collections</p>
          {!pendingCollections.length ? (
            <DashboardEmptyState
              className="mt-2 border-0 bg-transparent p-0 shadow-none"
              title="All clear"
              description="No pending collections."
            />
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingCollections.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="block truncate text-sm font-semibold text-slate-800 hover:text-blue-700">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
