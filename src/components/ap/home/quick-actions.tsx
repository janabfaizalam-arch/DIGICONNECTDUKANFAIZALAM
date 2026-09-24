import Link from "next/link";
import {
  BadgeIndianRupee,
  ClipboardCheck,
  FilePlus2,
  Files,
  Headphones,
  IndianRupee,
  ReceiptText,
  Search,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";

import { getPartnerHomeActions } from "@/lib/ap/home-config";
import type { DigiPartnerType } from "@/lib/ap/partner-type";
import type { PartnerQuickAction } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

const ICONS = {
  UserPlus,
  FilePlus2,
  Files,
  UploadCloud,
  IndianRupee,
  BadgeIndianRupee,
  Users,
  Search,
  ClipboardCheck,
  ReceiptText,
  Headphones,
} as const;

/**
 * The two actions that make the partner money lead the row in full brand
 * colour; the rest are quiet tiles. A row of seven identical cards gives the
 * eye no entry point, which is what the old grid did.
 */
const LEAD_ACTIONS = new Set(["new-customer", "apply-service", "collect-payment", "process-application"]);

type QuickActionsProps = {
  partnerType: DigiPartnerType;
  className?: string;
};

function ActionCard({ action, lead }: { action: PartnerQuickAction; lead: boolean }) {
  const Icon = ICONS[action.iconName];

  return (
    <Link
      href={action.href}
      className={cn(
        "group relative w-[132px] shrink-0 snap-start overflow-hidden rounded-[14px] p-2.5 transition-all duration-200",
        "active:scale-[0.97] md:w-auto",
        lead
          ? "text-white shadow-[0_8px_20px_-10px_rgba(18,104,232,0.75)] hover:shadow-[0_14px_28px_-12px_rgba(18,104,232,0.85)] hover:brightness-[1.06]"
          : "dcp-card dcp-card-link",
      )}
      style={lead ? { backgroundImage: "var(--dcp-g-brand)" } : undefined}
    >
      {lead ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/20 blur-2xl"
        />
      ) : null}

      <span
        className={cn(
          "dcp-chip relative h-8 w-8",
          lead
            ? "bg-white/20 text-white shadow-none"
            : "bg-[var(--dcp-surface-2)] text-[var(--dcp-ink-3)] group-hover:bg-[var(--dcp-brand-soft)] group-hover:text-[var(--dcp-brand-deep)]",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <span className="relative mt-2 block">
        <span
          className={cn(
            "block text-[12.5px] font-bold leading-tight",
            lead ? "text-white" : "text-[var(--dcp-ink)]",
          )}
        >
          {action.label}
        </span>
        {action.description ? (
          <span
            className={cn(
              "mt-0.5 hidden text-[10.5px] font-medium leading-snug md:block",
              lead ? "text-white/80" : "text-[var(--dcp-ink-4)]",
            )}
          >
            {action.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * The things a partner opens the app to do.
 *
 * On a phone this is a snap-scrolling rail rather than a wrapped grid: six
 * two-column cards push everything below them off the first screen, and a rail
 * keeps the whole set reachable with a thumb while the page below stays
 * visible. From `md` up there is room for the grid, so it becomes one.
 */
export function QuickActions({ partnerType, className }: QuickActionsProps) {
  const actions = getPartnerHomeActions(partnerType);

  return (
    <section aria-label="Quick actions" className={cn("space-y-2", className)}>
      <h2 className="dcp-h2">Quick actions</h2>

      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1",
          // scroll-padding, not just padding: a mandatory snap container aligns
          // the first card to its *snapport*, which ignores padding-left and
          // pulls the card flush against the screen edge. This keeps the rail's
          // gutter equal to the page's.
          "scroll-pl-4 md:scroll-pl-0",
          "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
          "md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-7",
        )}
      >
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} lead={LEAD_ACTIONS.has(action.key)} />
        ))}
      </div>
    </section>
  );
}
