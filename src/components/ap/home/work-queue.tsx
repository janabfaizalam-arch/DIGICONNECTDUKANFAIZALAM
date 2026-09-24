"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { getApplicationStatusLabel } from "@/lib/application-status";
import type { PartnerPendingWorkItem, PartnerWorkQueueGroup } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type WorkQueueProps = {
  groups: PartnerWorkQueueGroup[];
};

function QueueRow({ item }: { item: PartnerPendingWorkItem }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-[16px] border border-slate-200/70 bg-white p-3 transition duration-150 hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{item.subtitle}</p>
        <p className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
          {getApplicationStatusLabel(item.statusLabel)}
        </p>
      </div>

      <Link
        href={item.href}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1268e8] px-3.5 text-xs font-bold text-white transition duration-150 hover:bg-[#0d55c0] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
      >
        {item.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Everything waiting on the partner, in one tabbed list.
 *
 * This replaces both the old "Pending Work" section and the three-column
 * footer underneath it, which listed the same applications a second time under
 * different headings. Tabs carry their own counts so switching is a decision,
 * not a guess, and an empty tab is still selectable — a zero is information.
 */
export function WorkQueue({ groups }: WorkQueueProps) {
  const populated = useMemo(() => groups.filter((group) => group.items.length > 0), [groups]);
  const [active, setActive] = useState(0);

  if (!populated.length) {
    return (
      <section aria-label="Work queue" className="space-y-2.5">
        <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Work queue</h2>
        <div className="flex items-center gap-3 rounded-[18px] border border-[#0f9268]/20 bg-[#ecfdf5] p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0f9268]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-slate-900">You&rsquo;re all caught up</p>
            <p className="mt-0.5 text-xs font-medium text-slate-600">
              Nothing is waiting on you. New work lands here as it arrives.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const current = populated[Math.min(active, populated.length - 1)];

  return (
    <section aria-label="Work queue" className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Work queue</h2>
        <Link href="/ap/applications" className="text-xs font-bold text-[#1268e8] hover:underline">
          All applications
        </Link>
      </div>

      {populated.length > 1 ? (
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
          role="tablist"
          aria-label="Work queue groups"
        >
          {populated.map((group, index) => (
            <button
              key={group.key}
              type="button"
              role="tab"
              id={`work-tab-${group.key}`}
              aria-selected={index === active}
              aria-controls={`work-panel-${group.key}`}
              onClick={() => setActive(index)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2",
                index === active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {group.label}
              <span
                className={cn(
                  "ml-1.5 rounded-md px-1.5 py-0.5 tabular-nums",
                  index === active ? "bg-white/20" : "bg-slate-100 text-slate-500",
                )}
              >
                {group.items.length}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <ul
        id={`work-panel-${current.key}`}
        role={populated.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={populated.length > 1 ? `work-tab-${current.key}` : undefined}
        className="space-y-2"
      >
        {current.items.map((item) => (
          <QueueRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
