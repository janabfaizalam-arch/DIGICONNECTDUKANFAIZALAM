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

type QuickActionsProps = {
  partnerType: DigiPartnerType;
};

function ActionCard({ action }: { action: PartnerQuickAction }) {
  const Icon = ICONS[action.iconName];

  return (
    <Link
      href={action.href}
      className={cn(
        "group flex w-[136px] shrink-0 snap-start flex-col gap-2.5 rounded-[18px] border border-slate-200/70 bg-white p-3",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200",
        "hover:border-[#1268e8]/40 hover:shadow-[0_10px_26px_-16px_rgba(18,104,232,0.5)]",
        "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2",
        // On a wide screen the row becomes a grid, so the fixed width goes away.
        "md:w-auto md:min-h-[92px]",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1268e8] transition duration-200 group-hover:bg-[#1268e8] group-hover:text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight text-slate-900">{action.label}</span>
        {action.description ? (
          <span className="mt-0.5 hidden text-[11px] font-medium leading-snug text-slate-500 md:block">
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
export function QuickActions({ partnerType }: QuickActionsProps) {
  const actions = getPartnerHomeActions(partnerType);

  return (
    <section aria-label="Quick actions" className="space-y-2.5">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Quick actions</h2>

      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1",
          "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
          "md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4",
        )}
      >
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </div>
    </section>
  );
}
