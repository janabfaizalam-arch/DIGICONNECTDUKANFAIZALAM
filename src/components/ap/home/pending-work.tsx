import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PartnerPendingWorkItem } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";

type PendingWorkProps = {
  items: PartnerPendingWorkItem[];
};

export function PendingWork({ items }: PendingWorkProps) {
  return (
    <section aria-label="Pending work" className="space-y-2.5 px-4 md:px-6">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Pending Work</h2>
      {!items.length ? (
        <DashboardEmptyState title="No pending work" description="You’re caught up. New actionable items will appear here." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2.5 rounded-[16px] border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{item.subtitle}</p>
                <p className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  {item.statusLabel}
                </p>
              </div>
              <Link
                href={item.href}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {item.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
