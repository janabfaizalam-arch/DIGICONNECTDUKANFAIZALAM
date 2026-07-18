"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Bell,
  ClipboardList,
  FolderCheck,
  LayoutDashboard,
  ListChecks,
  Menu,
  ReceiptText,
  Search,
  Settings,
  Ticket,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
  LoaderCircle,
  MapPin,
  Globe,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const navItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", description: "Command center & KPIs", icon: LayoutDashboard },
  { href: "/admin/agency-partners", label: "Partners", description: "CRM & KYC documents", icon: UserCheck },
  { href: "/admin/customers", label: "Customers", description: "360-degree profiles", icon: UsersRound },
  { href: "/admin/applications", label: "Applications", description: "Workflow engine", icon: ClipboardList },
  { href: "/admin/agent-services", label: "Services", description: "Catalog & margins", icon: ListChecks },
  { href: "/admin/wallet", label: "Wallet", description: "Ledger liability tracker", icon: WalletCards },
  { href: "/admin/commissions", label: "Commissions", description: "Payout logs & rules", icon: BadgePercent },
  { href: "/admin/documents", label: "Documents", description: "Vault storage audit", icon: FolderCheck },
  { href: "/admin/tickets", label: "Tickets", description: "Support requests queue", icon: Ticket },
  { href: "/admin/branches", label: "Branches", description: "Regional analytics", icon: MapPin },
  { href: "/admin/settings/saas", label: "SaaS Tenant", description: "Branding customizer", icon: Globe },
  { href: "/admin/settings/core-config", label: "Core Config", description: "Variables cockpit", icon: Sliders },
  { href: "/admin/notifications", label: "Notifications", description: "Alarms & system events", icon: Bell },
  { href: "/admin/reports", label: "Reports", description: "Financial distributions", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", description: "OS registry configuration", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  return (
    <nav className="space-y-1.5 px-2">
      {navItems.map(({ href, label, description, icon: Icon }) => {
        const active = isActivePath(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              if (!active) setLoadingHref(href);
              onNavigate?.();
            }}
            className={cn(
              "group/link relative flex min-h-11 items-center gap-3.5 rounded-xl px-3.5 py-2.5 transition-all duration-300 outline-none",
              active
                ? "text-blue-700 font-semibold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
            title={description}
          >
            {active && (
              <motion.div
                layoutId="activeNavBackground"
                className="absolute inset-0 rounded-xl bg-blue-50/60 border border-blue-100/50"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover/link:scale-105",
                active ? "text-blue-600 bg-white shadow-sm border border-blue-100/50" : "text-slate-400 group-hover/link:text-slate-700"
              )}
            >
              {loadingHref === href ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <Icon className="h-4.5 w-4.5" />
              )}
            </span>
            <span className="relative z-10 min-w-0 flex-1">
              <span className="block truncate text-sm leading-5 font-semibold">
                {loadingHref === href ? "Opening..." : label}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc]/60 text-slate-900 relative overflow-x-hidden font-sans antialiased selection:bg-blue-100/60 selection:text-blue-800">
      {/* Background Ambient Glow Spots */}
      <div className="ambient-glow ambient-blue w-[500px] h-[500px] -top-96 -left-48 opacity-10 absolute pointer-events-none" />
      <div className="ambient-glow ambient-orange w-[500px] h-[500px] top-1/2 -right-96 opacity-10 absolute pointer-events-none" />

      <div className="flex min-h-screen w-full relative z-10">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 py-6 shadow-[1px_0_0_rgba(15,23,42,0.01)] lg:flex lg:flex-col justify-between">
          <div className="space-y-6">
            <Link href="/admin" className="block px-4 transition-transform active:scale-98">
              <p className="text-lg font-bold tracking-tight text-slate-900 font-heading">DigiConnect Dukan</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">DS-OS V3 Control</p>
              </div>
            </Link>
            <div className="h-[calc(100vh-12rem)] overflow-y-auto no-scrollbar py-2">
              <AdminNav />
            </div>
          </div>
          <div className="px-2">
            <LogoutButton className="h-11 w-full justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] duration-200" />
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="relative flex h-full w-[min(20rem,85vw)] flex-col bg-white p-5 shadow-2xl z-10 justify-between"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b pb-4">
                    <Link href="/admin" onClick={() => setMobileOpen(false)}>
                      <p className="text-md font-bold text-slate-900 font-heading">DigiConnect Dukan</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">DS-OS V3 Control</p>
                    </Link>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar py-2">
                    <AdminNav onNavigate={() => setMobileOpen(false)} />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <LogoutButton className="h-11 w-full justify-center rounded-xl font-bold text-sm shadow-sm" onLoggedOut={() => setMobileOpen(false)} />
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Workspace Content Area */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-md px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.01)] lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    Control Room
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-400 hidden md:block">
                    India&apos;s Digital Service Network Operating System
                  </p>
                </div>
              </div>

              {/* Quick Actions Search Bar mock or link to apps */}
              <div className="relative max-w-xs w-full hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  id="global-search-input-header"
                  onClick={() => {
                    const el = document.getElementById("global-search-input");
                    if (el) el.focus();
                  }}
                  className="w-full text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-full py-2 pl-9 pr-4 cursor-pointer outline-none transition"
                />
              </div>

              <AdminNotificationsBell />
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8 flex-1 min-w-0">{children}</main>
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/50 pb-5 mb-6">
      <div>
        {eyebrow ? (
          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-orange-700 ring-1 ring-inset ring-orange-700/10">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-heading">{title}</h1>
        {description ? <p className="mt-1 text-sm font-medium text-slate-500 max-w-2xl">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center glass-liquid-premium">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1.5 text-xs text-slate-500 leading-normal max-w-sm mx-auto">{description}</p>
    </div>
  );
}

export function AdminUnderSetup({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm glass-liquid-premium">
      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-orange-700 ring-1 ring-inset ring-orange-700/10">
        Under Setup
      </span>
      <h2 className="mt-3 text-xl font-bold text-slate-900 font-heading">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
        {description ?? "This admin section is ready, but its database tables or columns are not available yet."}
      </p>
    </div>
  );
}

export function AdminStatCard({
  title,
  value,
  icon,
  tone = "blue",
}: {
  title: string;
  value: React.ReactNode;
  icon: keyof typeof statIconMap | LucideIcon;
  tone?: "blue" | "orange" | "green" | "slate";
}) {
  const Icon = typeof icon === "string" ? (statIconMap[icon as keyof typeof statIconMap] ?? UsersRound) : icon;
  const toneClass = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-md p-5 transition-all duration-300 hover:border-slate-300 hover:shadow-xs group glass-liquid-premium">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <span className={cn("flex h-8.5 w-8.5 items-center justify-center rounded-lg border text-xs transition-transform duration-300 group-hover:scale-105", toneClass)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 font-heading">{value}</p>
    </div>
  );
}

const statIconMap = {
  badgePercent: BadgePercent,
  calendarDays: MapPin, // placeholder
  clipboardList: ClipboardList,
  fileClock: FileText, // placeholder
  fileText: ClipboardList,
  gift: BadgePercent, // placeholder
  inbox: FolderCheck,
  indianRupee: WalletCards,
  listChecks: ListChecks,
  phone: UsersRound,
  receiptText: ReceiptText,
  repeat: WalletCards,
  userCheck: UserCheck,
  users: UsersRound,
  wallet: WalletCards,
};

import { FileText } from "lucide-react";
