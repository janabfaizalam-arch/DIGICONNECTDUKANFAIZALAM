"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  type LucideIcon,
  PlusCircle,
  FileText,
  HandCoins,
  WalletCards,
  UserCog,
  Headphones,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/ap/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ap/applications/new", label: "New Application", icon: PlusCircle },
  { href: "/ap/applications", label: "Applications", icon: FileText },
  { href: "/ap/customers", label: "Customers", icon: Users },
  { href: "/ap/commissions", label: "Commission", icon: HandCoins },
  { href: "/ap/wallet", label: "Wallet / Payout", icon: WalletCards },
  { href: "/ap/profile", label: "Profile", icon: UserCog },
  { href: "/ap/support", label: "Support", icon: Headphones },
];

export function APPanelNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-[3.25rem] z-30 border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 px-3 py-2 shadow-lg backdrop-blur-xl md:top-16">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto scrollbar-hide">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-400 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
        <LogoutButton showLabel={false} className="ml-auto h-10 w-10 shrink-0 rounded-xl p-0 text-slate-400 hover:text-white md:hidden" />
        <span className="hidden md:block">
          <LogoutButton className="h-10 shrink-0 rounded-xl text-slate-400 hover:text-white" />
        </span>
      </div>
    </div>
  );
}
