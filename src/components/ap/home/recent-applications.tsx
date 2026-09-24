import Link from "next/link";

import { getApplicationStatusLabel } from "@/lib/application-status";
import { statusBucket } from "@/lib/ap/home-analytics";
import type { PartnerRecentApplicationItem } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";
import { cn } from "@/lib/utils";

type RecentApplicationsProps = {
  items: PartnerRecentApplicationItem[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

/** Status chips reuse the bucket colours, so a row reads the same as the chart. */
const BUCKET_CHIP = {
  action_needed: "bg-[#fef2f3] text-[#a82437] ring-[#d1344a]/20",
  awaiting_payment: "bg-[#fef8ec] text-[#8a5c00] ring-[#c98500]/20",
  in_progress: "bg-[#eff6ff] text-[#0d4795] ring-[#1268e8]/20",
  completed: "bg-[#ecfdf5] text-[#0b6b4d] ring-[#0f9268]/20",
  closed: "bg-slate-100 text-slate-600 ring-slate-300/40",
} as const;

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        BUCKET_CHIP[statusBucket(status)],
      )}
    >
      {getApplicationStatusLabel(status)}
    </span>
  );
}

export function RecentApplications({ items }: RecentApplicationsProps) {
  return (
    <section aria-label="Recent applications" className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Recent applications</h2>
        <Link href="/ap/applications" className="text-xs font-bold text-[#1268e8] hover:underline">
          View all
        </Link>
      </div>

      {!items.length ? (
        <DashboardEmptyState title="No applications yet" description="Your submissions will show up here." />
      ) : (
        <>
          {/* Desktop: a real table, because these rows are compared column by column. */}
          <div className="hidden overflow-hidden rounded-[18px] border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Customer</th>
                  <th scope="col" className="px-4 py-2.5">Service</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Updated</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition duration-150 hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{item.customerName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{item.serviceName}</td>
                    <td className="px-4 py-2.5"><StatusChip status={item.status} /></td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-500">{formatDate(item.updatedAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {item.actions.map((action) => (
                          <Link
                            key={`${item.id}-${action.label}`}
                            href={action.href}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition duration-150 hover:border-[#1268e8]/40 hover:text-[#1268e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-1"
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

          {/* Phone: cards, because a five-column table on 360px is unreadable. */}
          <ul className="space-y-2 md:hidden">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-[16px] border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.customerName}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{item.serviceName}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                    {formatDate(item.updatedAt)}
                  </span>
                </div>

                <div className="mt-2"><StatusChip status={item.status} /></div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.actions.map((action) => (
                    <Link
                      key={`${item.id}-${action.label}`}
                      href={action.href}
                      className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-1"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
