import Link from "next/link";

import type { PartnerRecentApplicationItem } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";

type RecentApplicationsProps = {
  items: PartnerRecentApplicationItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function RecentApplications({ items }: RecentApplicationsProps) {
  return (
    <section aria-label="Recent applications" className="space-y-3 px-4 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-slate-900">Recent Applications</h2>
        <Link href="/ap/applications" className="text-xs font-bold text-blue-700 hover:underline">
          View all
        </Link>
      </div>

      {!items.length ? (
        <DashboardEmptyState title="No applications yet" description="New applications will show up here." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">{item.serviceName}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{item.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.actions.map((action) => (
                          <Link
                            key={`${item.id}-${action.label}`}
                            href={action.href}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                <p className="text-sm font-bold text-slate-900">{item.customerName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.serviceName}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="capitalize font-semibold text-slate-600">{item.status.replace(/_/g, " ")}</span>
                  <span className="text-slate-400">{formatDate(item.updatedAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.actions.map((action) => (
                    <Link
                      key={`${item.id}-${action.label}`}
                      href={action.href}
                      className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
