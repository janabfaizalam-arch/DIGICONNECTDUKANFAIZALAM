"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BellRing,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  GalleryHorizontalEnd,
  Gift,
  Images,
  LayoutDashboard,
  Menu,
  Newspaper,
  ShieldCheck,
  UserCog,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
};

const navGroups: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Dashboard",
    items: [
      {
        href: "/admin",
        label: "Control Room",
        description: "KPIs, charts, alerts",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Work Management",
    items: [
      { href: "/admin/applications", label: "Applications", description: "Service workflow", icon: FileText },
      {
        href: "/admin/insurance-quotations",
        label: "Insurance Quotations",
        description: "Quotes and follow-ups",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/customers", label: "Customers", description: "Customer records", icon: UsersRound },
      { href: "/admin/staff", label: "Staff", description: "Office users", icon: UserCog },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/homepage-notices", label: "Homepage Notices", description: "Offer strip", icon: BellRing },
      { href: "/admin/homepage-slides", label: "Homepage Slides", description: "Hero slider", icon: Images },
      { href: "/admin/gallery", label: "Gallery", description: "Photos and proof", icon: GalleryHorizontalEnd },
      { href: "/admin/articles", label: "Articles", description: "Blog content", icon: Newspaper },
    ],
  },
  {
    title: "Finance & Growth",
    items: [
      { href: "/admin/wallet", label: "DigiWallet", description: "Wallet balances", icon: WalletCards },
      { href: "/admin/referrals", label: "Referrals", description: "Referral tracking", icon: Gift },
      { href: "/admin/rewards", label: "Rewards", description: "Reward rules", icon: BadgePercent },
      { href: "/admin/cashback", label: "Cashback", description: "Cashback offers", icon: WalletCards },
    ],
  },
  {
    title: "Settings",
    items: [{ href: "/admin/services", label: "Services", description: "Catalog and pricing", icon: BriefcaseBusiness }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-3">
      {navGroups.map((group) => (
        <details key={group.title} open className="group rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-2 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {group.title}
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="mt-1 grid gap-1">
            {group.items.map(({ href, label, description, icon: Icon }) => {
              const active = isActivePath(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group/link flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  )}
                  title={description}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-white/18 text-white" : "bg-slate-100 text-slate-500 group-hover/link:text-blue-600",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold leading-5">{label}</span>
                    <span className={cn("block truncate text-xs leading-4", active ? "text-white/78" : "text-slate-400")}>
                      {description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </details>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-slate-200 bg-white px-5 py-6 shadow-sm lg:block">
          <Link href="/admin" className="block px-2">
            <p className="text-xl font-bold text-slate-950">DigiConnect Dukan</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Admin CRM</p>
          </Link>
          <div className="mt-7 h-[calc(100vh-10.5rem)] overflow-y-auto pr-1">
            <AdminNav />
          </div>
          <div className="absolute inset-x-5 bottom-5">
            <LogoutButton className="h-11 w-full justify-center rounded-2xl bg-slate-950 text-white hover:bg-slate-900" />
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-950/35"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <p className="text-lg font-bold text-slate-950">DigiConnect Dukan</p>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Admin CRM</p>
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
                <AdminNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <LogoutButton className="mt-4 h-11 w-full justify-center rounded-2xl" onLoggedOut={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 lg:hidden">
                <p className="truncate text-sm font-bold text-slate-950">DigiConnect Admin</p>
                <p className="text-xs text-slate-500">CRM workspace</p>
              </div>
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="text-sm font-bold text-slate-950">Premium CRM Dashboard</p>
                <p className="text-xs text-slate-500">Manage applications, customers, quotations, and growth from one place.</p>
              </div>
              <AdminNotificationsBell />
            </div>
          </header>

          <main className="px-4 py-5 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-base font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function AdminUnderSetup({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Under Setup</p>
      <h2 className="mt-3 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description ?? "This admin section is ready, but its database tables or columns are not available yet."}
      </p>
    </div>
  );
}

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "orange" | "green" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function AdminQuickActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200">
      <Icon className="h-5 w-5 text-orange-600" />
      <p className="mt-3 font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
