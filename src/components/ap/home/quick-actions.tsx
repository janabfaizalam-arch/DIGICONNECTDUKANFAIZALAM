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
        "group flex min-h-[72px] flex-col justify-between rounded-[16px] border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "transition duration-200 hover:border-blue-200 hover:shadow-[0_8px_20px_-12px_rgba(37,99,235,0.35)]",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="text-[13px] font-semibold leading-tight text-slate-900">{action.label}</p>
        {action.description ? (
          <p className="hidden text-[11px] font-medium leading-snug text-slate-500 sm:line-clamp-2 sm:block">
            {action.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function QuickActions({ partnerType }: QuickActionsProps) {
  const actions = getPartnerHomeActions(partnerType);

  return (
    <section aria-label="Primary quick actions" className="space-y-2.5 px-4 md:px-6">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </div>
    </section>
  );
}
