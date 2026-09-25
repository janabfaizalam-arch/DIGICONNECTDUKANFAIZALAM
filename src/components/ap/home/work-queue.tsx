"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";

import { getApplicationStatusLabel } from "@/lib/application-status";
import type { PartnerPendingWorkItem, PartnerWorkQueueGroup } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type WorkQueueProps = {
  groups: PartnerWorkQueueGroup[];
  className?: string;
};

const VISIBLE = 4;

function QueueRow({ item }: { item: PartnerPendingWorkItem }) {
  return (
    <li className="dcp-card flex flex-col gap-2.5 p-2.5 transition duration-150 hover:border-[var(--dcp-line-2)] sm:flex-row sm:items-center sm:gap-3">
      <span aria-hidden className="dcp-chip h-9 w-9 shrink-0">
        <FileText className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-[13px] font-bold text-[var(--dcp-ink)]">{item.title}</p>
          <span className="rounded-md bg-[var(--dcp-surface-3)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--dcp-ink-2)]">
            {getApplicationStatusLabel(item.statusLabel)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11.5px] font-medium text-[var(--dcp-ink-3)]">{item.subtitle}</p>
      </div>

      <Link
        href={item.href}
        className="dcp-btn dcp-btn-brand h-9 shrink-0 px-3"
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
export function WorkQueue({ groups, className }: WorkQueueProps) {
  const populated = useMemo(() => groups.filter((group) => group.items.length > 0), [groups]);
  const [active, setActive] = useState(0);

  if (!populated.length) {
    return (
      <section aria-label="Work queue" className={cn("space-y-2", className)}>
        <h2 className="dcp-h2">Work queue</h2>
        <div className="flex items-center gap-3 rounded-[18px] border border-[#0f9268]/20 bg-[#ecfdf5] p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0f9268]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[var(--dcp-ink)]">You&rsquo;re all caught up</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--dcp-ink-2)]">
              Nothing is waiting on you. New work lands here as it arrives.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
    Four rows a group. The tab's own badge still shows the real count, so
    nothing is hidden -- the rail just stops being a list to scroll past.
  */
  const current = populated[Math.min(active, populated.length - 1)];

  return (
    <section aria-label="Work queue" className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="dcp-h2">Work queue</h2>
        <Link href="/ap/applications" className="shrink-0 rounded-lg bg-[var(--dcp-brand-soft)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--dcp-brand-deep)] transition hover:brightness-95">
          See all
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
                  ? "text-white shadow-[0_6px_16px_-8px_rgba(18,104,232,0.8)] [background-image:var(--dcp-g-brand)]"
                  : "border border-[var(--dcp-line)] bg-white text-[var(--dcp-ink-2)] hover:bg-[var(--dcp-surface-2)]",
              )}
            >
              {group.label}
              <span
                className={cn(
                  "ml-1.5 rounded-md px-1.5 py-0.5 tabular-nums",
                  index === active ? "bg-white/20" : "bg-[var(--dcp-surface-3)] text-[var(--dcp-ink-3)]",
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
        {current.items.slice(0, VISIBLE).map((item) => (
          <QueueRow key={item.id} item={item} />
        ))}
      </ul>

      {/* The tab already carries the true count; this is the way to the rest. */}
      {current.items.length > VISIBLE ? (
        <Link
          href="/ap/applications"
          className="dcp-btn dcp-btn-quiet w-full text-[11.5px]"
        >
          {current.items.length - VISIBLE} more in {current.label.toLowerCase()}
        </Link>
      ) : null}
    </section>
  );
}
