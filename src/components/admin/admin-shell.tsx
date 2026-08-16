"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderCheck,
  ListChecks,
  Menu,
  ReceiptText,
  Search,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";
import { LogoutButton } from "@/components/auth/logout-button";
import { ADMIN_NAV_GROUPS, isAdminNavActive } from "@/lib/admin/nav";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "dcd_admin_sidebar_collapsed";
const GROUP_COLLAPSE_KEY = "dcd_admin_nav_groups";

/** Routes under /admin that are signed-out pages: they render without admin chrome. */
const AUTH_PATHS = new Set(["/admin/login"]);

function AdminNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/admin";
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const defaults = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of ADMIN_NAV_GROUPS) {
      map[group.id] = !group.defaultCollapsed;
    }
    return map;
  }, []);

  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUP_COLLAPSE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setGroupOpen({ ...defaults, ...parsed });
      } else {
        setGroupOpen(defaults);
      }
    } catch {
      setGroupOpen(defaults);
    }
  }, [defaults]);

  // Auto-expand group containing the active route.
  useEffect(() => {
    const activeGroup = ADMIN_NAV_GROUPS.find((group) =>
      group.items.some((item) => isAdminNavActive(pathname, item.href)),
    );
    if (!activeGroup) return;
    setGroupOpen((prev) => {
      if (prev[activeGroup.id]) return prev;
      const next = { ...prev, [activeGroup.id]: true };
      try {
        window.localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setGroupOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <nav className="space-y-1.5 px-1.5" aria-label="Admin">
      {ADMIN_NAV_GROUPS.map((group) => {
        const open = collapsed ? true : Boolean(groupOpen[group.id] ?? !group.defaultCollapsed);
        const groupHasActive = group.items.some((item) => isAdminNavActive(pathname, item.href));

        return (
          <div key={group.id}>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "mb-0.5 flex h-7 w-full items-center justify-between rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                  groupHasActive ? "bg-slate-50" : "hover:bg-slate-50",
                )}
                aria-expanded={open}
              >
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.12em]",
                    groupHasActive ? "text-blue-700" : "text-slate-400",
                  )}
                >
                  {group.label}
                </span>
                <ChevronDown className={cn("h-3 w-3 text-slate-400 transition", open && "rotate-180")} />
              </button>
            ) : (
              <div className="my-1 border-t border-slate-100 first:mt-0 first:border-0" />
            )}

            {open ? (
              <div className="space-y-0.5">
                {group.items.map(({ href, label, description, icon: Icon, emphasis }) => {
                  const active = isAdminNavActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? `${label} — ${description}` : description}
                      onClick={() => {
                        if (!active) setLoadingHref(href.split("#")[0] || href);
                        onNavigate?.();
                      }}
                      className={cn(
                        "group/link relative flex min-h-10 items-center gap-2.5 rounded-lg px-2 py-1.5 transition outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                        active
                          ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20"
                          : emphasis
                            ? "border border-indigo-200 bg-indigo-50/80 text-indigo-800 font-semibold hover:bg-indigo-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        collapsed && "justify-center px-1.5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          active
                            ? "bg-white/15 text-white"
                            : emphasis
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover/link:bg-slate-200 group-hover/link:text-slate-700",
                        )}
                      >
                        {loadingHref === (href.split("#")[0] || href) ? (
                          <DigiConnectLoader variant="inline" size="xs" label="Opening..." showLabel={false} />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </span>
                      {!collapsed ? (
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {loadingHref === (href.split("#")[0] || href) ? "Opening…" : label}
                        </span>
                      ) : null}
                      {!collapsed && emphasis && !active ? (
                        <span className="rounded bg-indigo-600/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                          Quick
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAuthPage = AUTH_PATHS.has(pathname);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Lock background scroll only while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

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

  // Signed-out pages own the full viewport — no sidebar, topbar, or logout button.
  if (isAuthPage) return <>{children}</>;

  return (
    <div
      data-admin-chrome
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)] text-slate-900 relative overflow-x-hidden font-sans antialiased"
    >
      <div className="flex min-h-screen w-full min-w-0">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur px-3 py-5 lg:flex lg:flex-col justify-between transition-[width]",
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
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200"
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

        <div className="min-w-0 flex-1 flex flex-col overflow-x-hidden">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
                <AdminBreadcrumbs />
                <p className="hidden truncate text-[11px] font-medium text-slate-400 sm:block">DigiConnect Dukan · RNOS India Pvt. Ltd.</p>
              </div>
              <AdminGlobalSearch className="hidden lg:block" />
              <button
                type="button"
                aria-label="Search CRM"
                aria-expanded={mobileSearchOpen}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 lg:hidden",
                  mobileSearchOpen && "border-blue-300 bg-blue-50 text-blue-700",
                )}
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                <Search className="h-4 w-4" />
              </button>
              <AdminNotificationsBell />
            </div>
            {mobileSearchOpen ? (
              <div className="mt-2 min-w-0 lg:hidden">
                <AdminGlobalSearch className="max-w-none" autoFocus placeholder="Search CRM…" />
              </div>
            ) : null}
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 md:px-6 md:py-6">{children}</main>
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
