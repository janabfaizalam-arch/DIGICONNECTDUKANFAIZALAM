/**
 * Admin sidebar information architecture (Phase B).
 * Only operational modules — no stubs (Tickets, Core Config).
 */

import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  Image,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

/** Canonical Digi Partner hub (legacy /admin/agents redirects here). */
export const ADMIN_DIGI_PARTNERS_ROUTE = "/admin/agency-partners";

/** Canonical Services destination for Phase B (unification deferred to Phase D). */
export const ADMIN_SERVICES_ROUTE = "/admin/agent-services";

/** Homepage CMS hub (links existing CMS pages). */
export const ADMIN_HOMEPAGE_CMS_ROUTE = "/admin/homepage";

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", description: "KPIs and operations", icon: LayoutDashboard },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/applications", label: "Applications", description: "Workflow engine", icon: ClipboardList },
      { href: "/admin/customers", label: "Customers", description: "Customer 360", icon: UsersRound },
      { href: ADMIN_DIGI_PARTNERS_ROUTE, label: "Digi Partners", description: "KYC and partner CRM", icon: UserCheck },
      { href: "/admin/partner-banners", label: "Partner Banners", description: "Digi Partner home slider", icon: Image },
      { href: ADMIN_SERVICES_ROUTE, label: "Services", description: "Catalog and pricing", icon: ListChecks },
      { href: "/admin/payments", label: "Payments", description: "Payment ledger", icon: ReceiptText },
      { href: "/admin/offline-invoices", label: "Offline Invoices", description: "Manual invoices", icon: FileText },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/admin/wallet", label: "Wallet", description: "Liability ledger", icon: WalletCards },
      { href: "/admin/coupons", label: "Coupons", description: "Discount codes", icon: BadgePercent },
      { href: "/admin/commissions", label: "Commissions", description: "Partner earnings", icon: ShieldCheck },
      { href: "/admin/payment-reconciliation", label: "Reconciliation", description: "Razorpay match", icon: ReceiptText },
    ],
  },
  {
    id: "crm-content",
    label: "CRM / Content",
    items: [
      { href: "/admin/leads", label: "Leads", description: "Lead list and pipeline", icon: TrendingUp },
      { href: "/admin/notifications", label: "Notifications", description: "System alerts", icon: Bell },
      { href: ADMIN_HOMEPAGE_CMS_ROUTE, label: "Homepage CMS", description: "Banners and notices", icon: Image },
      { href: "/admin/articles", label: "Articles", description: "Knowledge content", icon: FileText },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", description: "Operational reports", icon: BarChart3 },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", description: "Platform settings", icon: Settings },
    ],
  },
];

export function flattenAdminNav(): AdminNavItem[] {
  return ADMIN_NAV_GROUPS.flatMap((group) => group.items);
}

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveAdminBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: "Admin", href: "/admin" }];
  if (pathname === "/admin") {
    crumbs.push({ label: "Dashboard" });
    return crumbs;
  }

  const match = flattenAdminNav().find((item) => isAdminNavActive(pathname, item.href) && item.href !== "/admin");
  if (match) {
    crumbs.push({ label: match.label, href: match.href });
    const rest = pathname.slice(match.href.length).split("/").filter(Boolean);
    if (rest.length) {
      crumbs.push({ label: rest[rest.length - 1] });
    }
    return crumbs;
  }

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  let acc = "/admin";
  segments.forEach((segment, index) => {
    acc += `/${segment}`;
    const label = segment
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    crumbs.push(index === segments.length - 1 ? { label } : { label, href: acc });
  });
  return crumbs;
}

/** Legacy routes retained but removed from nav — redirect or hub targets. */
export const ADMIN_LEGACY_ROUTE_NOTES = [
  { from: "/admin/agents", to: ADMIN_DIGI_PARTNERS_ROUTE, note: "Legacy agent list → Digi Partners" },
  { from: "/admin/agents/new", to: `${ADMIN_DIGI_PARTNERS_ROUTE}/new`, note: "Legacy agent create" },
  { from: "/admin/tickets", to: null, note: "Hidden — localStorage stub only" },
  { from: "/admin/settings/core-config", to: null, note: "Hidden — mock save UI" },
  { from: "/admin/cashback", to: "/admin/wallet", note: "Alias redirect already present" },
  { from: "/admin/rewards", to: "/admin/wallet", note: "Alias redirect already present" },
  { from: "/admin/services", to: ADMIN_SERVICES_ROUTE, note: "Phase D unification; nav points to agent-services" },
] as const;
