"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
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
import { AdminWorkspaceSwitch } from "@/components/admin/admin-workspace-switch";
import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  getAdminWorkspace,
  isAdminNavActive,
  navigableGroups,
  workspaceForPath,
  type AdminNavGroup,
} from "@/lib/admin/nav";
import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "dcd_admin_sidebar_collapsed";
const GROUP_COLLAPSE_KEY = "dcd_admin_nav_groups";

/* ─────────────────────────────────────────────────────────────────────────
   Navigation
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The sidebar for whichever workspace you are in.
 *
 * Only that workspace's groups render, which is the point of having two: the
 * customer list is no longer half partner screens. Groups remember whether
 * they were open, and the group holding the current page opens itself, so
 * arriving from a link never leaves you looking at a collapsed list.
 */
function AdminNav({
  groups,
  collapsed,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "/admin";
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  const defaults = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of groups) map[group.id] = !group.defaultCollapsed;
    return map;
  }, [groups]);

  useEffect(() => setLoadingHref(null), [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUP_COLLAPSE_KEY);
      setGroupOpen(raw ? { ...defaults, ...(JSON.parse(raw) as Record<string, boolean>) } : defaults);
    } catch {
      setGroupOpen(defaults);
    }
  }, [defaults]);

  useEffect(() => {
    const activeGroup = groups.find((group) =>
      group.items.some((item) => isAdminNavActive(pathname, item.href)),
    );
    if (!activeGroup) return;
    setGroupOpen((prev) => {
      if (prev[activeGroup.id]) return prev;
      const next = { ...prev, [activeGroup.id]: true };
      try {
        window.localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* a nav that cannot remember is still a nav */
      }
      return next;
    });
  }, [pathname, groups]);

  const toggleGroup = (id: string) =>
    setGroupOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <nav className="space-y-1 px-1" aria-label="Admin sections">
      {groups.map((group) => {
        const open = collapsed ? true : Boolean(groupOpen[group.id] ?? !group.defaultCollapsed);
        const groupHasActive = group.items.some((item) => isAdminNavActive(pathname, item.href));

        return (
          <div key={group.id}>
            {!collapsed ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={open}
                className={cn(
                  "mb-0.5 flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dc-blue-bright)]",
                  groupHasActive ? "bg-[var(--dc-sky-soft)]" : "hover:bg-[var(--dc-sky-soft)]",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-[0.15em]",
                    groupHasActive ? "text-[var(--dc-flame)]" : "text-[var(--dc-body)]",
                  )}
                >
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-[var(--dc-body)] transition-transform duration-200",
                    open && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div className="my-1.5 h-px bg-[var(--dc-ink)]/8" aria-hidden="true" />
            )}

            {open ? (
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? `${item.label} — ${item.description}` : undefined}
                        onClick={() => {
                          if (!active) setLoadingHref(item.href);
                          onNavigate?.();
                        }}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-[var(--dc-sky-soft)] text-[var(--dc-blue-deep)]"
                            : "text-[var(--dc-ink)] hover:bg-[var(--dc-sky-soft)]",
                        )}
                      >
                        {/* The active marker is a bar, not a colour change:
                            colour alone is not a signal everybody receives. */}
                        {active ? (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                            style={{ background: "var(--dc-grad-flame)" }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                            active
                              ? "text-white"
                              : "bg-[var(--dc-ink)]/5 text-[var(--dc-blue-mid)] group-hover:bg-[var(--dc-ink)]/8",
                          )}
                          style={active ? { background: "var(--dc-grad-blue)" } : undefined}
                        >
                          {loadingHref === item.href ? (
                            <DigiConnectLoader className="h-3.5 w-3.5" />
                          ) : (
                            <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                          )}
                        </span>
                        {!collapsed ? (
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-[13px] leading-tight",
                                active ? "font-extrabold" : "font-bold",
                              )}
                            >
                              {item.label}
                            </span>
                          </span>
                        ) : null}
                        {!collapsed && item.emphasis ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: "var(--dc-grad-flame)" }}
                            aria-hidden="true"
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shell
   ───────────────────────────────────────────────────────────────────────── */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isAuthPage = isAuthRoutePath(pathname);

  const workspaceId = workspaceForPath(pathname);
  const workspace = getAdminWorkspace(workspaceId);
  // Half-built screens are listed on the workspace home with a label, never
  // offered here as though they worked.
  const groups = navigableGroups(workspace);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  // Signed-out pages own the full viewport — no sidebar, header or logout.
  if (isAuthPage) return <>{children}</>;

  const brand = (
    <Link href="/admin" className="min-w-0">
      <span className="block text-[15px] font-extrabold leading-tight tracking-tight text-[var(--dc-ink)]">
        DigiConnect <span className="text-[var(--dc-flame)]">Dukan</span>
      </span>
      <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-body)]">
        Admin Control
      </span>
    </Link>
  );

  return (
    <div
      data-admin-chrome
      className="dc-ambient relative min-h-screen overflow-x-hidden bg-[var(--dc-sky-soft)] font-sans text-[var(--dc-ink)] antialiased"
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-orb dc-orb-blue -left-[18%] -top-[22%] h-[30rem] w-[30rem] opacity-30" />
        <div className="dc-orb dc-orb-flame -right-[16%] top-[38%] h-[26rem] w-[26rem] opacity-20" />
      </div>

      <div className="relative flex min-h-screen w-full min-w-0">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-[var(--dc-ink)]/8 bg-white/70 px-2.5 py-4 backdrop-blur-xl transition-[width] duration-300 lg:flex",
            collapsed ? "w-[4.75rem]" : "w-[17.5rem]",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className={cn("flex items-start gap-2 px-1.5", collapsed && "justify-center px-0")}>
              {collapsed ? null : brand}
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--dc-ink)]/10 bg-white/70 text-[var(--dc-body)] transition hover:text-[var(--dc-ink)]"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <div className={cn(collapsed ? "px-0" : "px-1")}>
              <AdminWorkspaceSwitch active={workspaceId} collapsed={collapsed} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-3">
              <AdminNav groups={groups} collapsed={collapsed} />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-[var(--dc-ink)]/8 px-1 pt-3">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open the live website"
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-2.5 text-[12.5px] font-bold text-[var(--dc-body)] transition hover:bg-[var(--dc-sky-soft)] hover:text-[var(--dc-ink)]",
                collapsed && "justify-center px-0",
              )}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              {collapsed ? null : "View website"}
            </Link>
            {/* The ramp is painted, not inherited: the label is white, and a
                white label on the default surface is an invisible button. */}
            <LogoutButton
              portal="admin"
              className={cn(
                "h-10 w-full justify-center rounded-xl border-0 bg-[var(--dc-blue-deep)] text-[13px] font-bold text-white shadow-[0_10px_22px_-14px_rgba(0,29,95,0.9)] hover:bg-[var(--dc-blue-mid)]",
                collapsed && "px-0",
              )}
            />
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[var(--dc-blue-deep)]/45 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="relative z-10 flex h-full w-[min(20.5rem,88vw)] flex-col bg-white p-3.5 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--dc-ink)]/8 pb-3">
                  {brand}
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--dc-ink)]/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-3">
                  <AdminWorkspaceSwitch active={workspaceId} onNavigate={() => setMobileOpen(false)} />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <AdminNav groups={groups} onNavigate={() => setMobileOpen(false)} />
                </div>

                <div className="space-y-1.5 border-t border-[var(--dc-ink)]/8 pt-3">
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-2 rounded-xl px-2.5 text-[12.5px] font-bold text-[var(--dc-body)]"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View website
                  </Link>
                  <LogoutButton
                    portal="admin"
                    className="h-10 w-full justify-center rounded-xl border-0 bg-[var(--dc-blue-deep)] text-[13px] font-bold text-white shadow-[0_10px_22px_-14px_rgba(0,29,95,0.9)]"
                    onLoggedOut={() => setMobileOpen(false)}
                  />
                </div>
              </motion.aside>
            </div>
          ) : null}
        </AnimatePresence>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-40 border-b border-[var(--dc-ink)]/8 bg-white/80 px-3.5 py-2.5 backdrop-blur-xl lg:px-6 lg:py-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--dc-ink)]/10 bg-white lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 overflow-hidden">
                <AdminBreadcrumbs />
              </div>

              <AdminGlobalSearch className="hidden lg:block" />
              <button
                type="button"
                aria-label="Search"
                aria-expanded={mobileSearchOpen}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--dc-ink)]/10 bg-white text-[var(--dc-ink)] lg:hidden",
                  mobileSearchOpen && "border-[var(--dc-blue-bright)]/40 bg-[var(--dc-sky-soft)]",
                )}
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                <Search className="h-4 w-4" />
              </button>
              <AdminNotificationsBell />
            </div>

            {mobileSearchOpen ? (
              <div className="mt-2 min-w-0 lg:hidden">
                <AdminGlobalSearch className="max-w-none" autoFocus placeholder="Search customers, applications…" />
              </div>
            ) : null}
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden px-3.5 py-4 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────────────────────────────────
   Page furniture
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The top of an admin screen.
 *
 * Every one of the panel's screens renders through these four components, so
 * restyling them is how sixty-odd pages pick up the liquid glass system at
 * once rather than one edit at a time. Their props are unchanged — an existing
 * screen gets the new look without being touched.
 */
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
    <div className="mb-5 flex flex-col gap-3 border-b border-[var(--dc-ink)]/8 pb-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-1.5 text-[1.4rem] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] font-medium leading-[1.55] text-[var(--dc-body)] sm:text-[14px]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Nothing here yet — and why that is fine. */
export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[var(--dc-ink)]/15 bg-white/60 p-8 text-center backdrop-blur-sm">
      <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">
        {description}
      </p>
    </div>
  );
}

/** The screen is built, but the database behind it is not ready. */
export function AdminUnderSetup({ title, description }: { title: string; description?: string }) {
  return (
    <div className="lg-card p-8 text-center">
      <span className="inline-flex items-center rounded-full bg-[var(--dc-amber)]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-flame)]">
        Under setup
      </span>
      <h2 className="mt-3 text-[1.15rem] font-extrabold text-[var(--dc-ink)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)]">
        {description ?? "This screen is ready, but its database tables or columns are not available yet."}
      </p>
    </div>
  );
}

/** One number, on a glass card. */
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

  const ramp: Record<string, string> = {
    blue: "var(--dc-grad-blue)",
    orange: "var(--dc-grad-flame)",
    green: "linear-gradient(135deg,#0f9d58,#34c77b)",
    slate: "linear-gradient(135deg,#475569,#94a3b8)",
  };

  return (
    <div className="lg-card lg-raise p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--dc-body)]">{title}</p>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] text-white"
          style={{ background: ramp[tone] ?? ramp.blue }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[1.6rem] font-extrabold leading-none tracking-[-0.02em] text-[var(--dc-ink)] tabular-nums">
        {value}
      </p>
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
