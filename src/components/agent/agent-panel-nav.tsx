"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, type LucideIcon, PlusCircle, FileText, ClipboardList, HandCoins, WalletCards, UserCog, Headphones } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/applications/new", label: "New Application", icon: PlusCircle },
  { href: "/agent/applications", label: "My Applications", icon: FileText },
  { href: "/agent/assigned-work", label: "Assigned Work", icon: ClipboardList },
  { href: "/agent/commissions", label: "Commission", icon: HandCoins },
  { href: "/agent/payout-history", label: "Wallet / Payout", icon: WalletCards },
  { href: "/agent/profile", label: "Profile", icon: UserCog },
  { href: "/agent/support", label: "Support", icon: Headphones },
];

export function AgentPanelNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-[3.25rem] z-30 border-b border-slate-200 bg-white/92 px-3 py-2 shadow-sm backdrop-blur md:top-16">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-bold transition",
                active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        <LogoutButton showLabel={false} className="ml-auto h-10 w-10 shrink-0 rounded-full p-0 md:hidden" />
        <span className="hidden md:block">
          <LogoutButton className="h-10 shrink-0 rounded-full" />
        </span>
      </div>
    </div>
  );
}
