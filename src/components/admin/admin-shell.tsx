"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderCheck,
  ListChecks,
  LoaderCircle,
  Menu,
  ReceiptText,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { LogoutButton } from "@/components/auth/logout-button";
import { ADMIN_NAV_GROUPS, isAdminNavActive } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "dcd_admin_sidebar_collapsed";

function AdminNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/admin";
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  return (
    <nav className="space-y-4 px-2">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {!collapsed ? (
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
          ) : (
            <div className="mb-1 border-t border-slate-100 first:border-0 first:pt-0 pt-2" />
          )}
          <div className="space-y-1">
            {group.items.map(({ href, label, description, icon: Icon }) => {
              const active = isAdminNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? `${label} — ${description}` : description}
                  onClick={() => {
                    if (!active) setLoadingHref(href);
                    onNavigate?.();
                  }}
                  className={cn(
                    "group/link relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 transition outline-none",
                    active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-white text-blue-600 shadow-sm border border-blue-100" : "text-slate-400 group-hover/link:text-slate-700",
                    )}
                  >
                    {loadingHref === href ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" /> : <Icon className="h-4 w-4" />}
                  </span>
                  {!collapsed ? (
                    <span className="min-w-0 flex-1 truncate text-sm">{loadingHref === href ? "Opening…" : label}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-x-hidden font-sans antialiased">
      <div className="flex min-h-screen w-full">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white px-3 py-5 lg:flex lg:flex-col justify-between transition-[width]",
            collapsed ? "w-[4.5rem]" : "w-72",
          )}
        >
          <div className="space-y-4 min-h-0 flex-1 flex flex-col">
            <div className={cn("flex items-start gap-2 px-2", collapsed && "justify-center px-0")}>
              <Link href="/admin" className={cn("min-w-0", collapsed && "sr-only")}>
                <p className="text-base font-bold tracking-tight text-slate-900">DigiConnect Dukan</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Admin Control</p>
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <AdminNav collapsed={collapsed} />
            </div>
          </div>
          <div className="px-1 pt-2 border-t border-slate-100">
            <LogoutButton
              portal="admin"
              className={cn(
                "h-10 w-full justify-center rounded-xl bg-slate-900 text-white text-sm font-bold",
                collapsed && "px-0",
              )}
            />
          </div>
        </aside>

        <AnimatePresence>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="relative z-10 flex h-full w-[min(20rem,88vw)] flex-col bg-white p-4 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">DigiConnect Dukan</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Admin</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <AdminNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <LogoutButton portal="admin" className="h-10 w-full justify-center rounded-xl text-sm font-bold" onLoggedOut={() => setMobileOpen(false)} />
                </div>
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>

        <div className="min-w-0 flex-1 flex flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <AdminBreadcrumbs />
                <p className="hidden text-[11px] font-medium text-slate-400 sm:block">DigiConnect Dukan · RNOS India Pvt. Ltd.</p>
              </div>
              <AdminGlobalSearch className="hidden md:block" />
              <AdminNotificationsBell />
            </div>
            <div className="mt-2 md:hidden">
              <AdminGlobalSearch />
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
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
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-normal text-slate-500">{description}</p>
    </div>
  );
}

export function AdminUnderSetup({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Under Setup
      </span>
      <h2 className="mt-3 text-xl font-bold text-slate-900">{title}</h2>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

const statIconMap = {
  badgePercent: BadgePercent,
  calendarDays: ClipboardList,
  clipboardList: ClipboardList,
  fileClock: ClipboardList,
  fileText: ClipboardList,
  gift: BadgePercent,
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
