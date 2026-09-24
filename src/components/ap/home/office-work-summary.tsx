import Link from "next/link";

import { formatCount } from "@/lib/ap/format";
import { cn } from "@/lib/utils";
import type { PartnerOfficeWorkSummary } from "@/lib/ap/home-types";

type OfficeWorkSummaryProps = {
  summary: PartnerOfficeWorkSummary;
  className?: string;
};

/**
 * The processing desk's own counters.
 *
 * Recent customers used to hang off the bottom of this block as well as off
 * the operations footer; they now live once, in the customers panel.
 */
export function OfficeWorkSummary({ summary, className }: OfficeWorkSummaryProps) {
  const tiles = [
    { label: "To process", value: formatCount(summary.applicationsToProcess), href: "/ap/assigned-work" },
    { label: "Assigned to me", value: formatCount(summary.assignedWorkCount), href: "/ap/assigned-work" },
    { label: "Support queue", value: formatCount(summary.supportQueueCount), href: "/ap/support" },
    { label: "Offline invoices", value: formatCount(summary.recentOfflineInvoices), href: "/ap/invoices/offline" },
  ];

  return (
    <section aria-label="Office work" className={cn("space-y-2", className)}>
      <h2 className="dcp-h2">Office work</h2>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-[18px] border border-[var(--dcp-line)] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:border-[var(--dcp-line-2)] hover:shadow-[0_10px_26px_-16px_rgba(15,23,42,0.3)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--dcp-ink-4)]">{tile.label}</p>
            <p className="mt-1.5 text-[21px] font-bold leading-none tracking-[-0.02em] text-[var(--dcp-ink)]">{tile.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
