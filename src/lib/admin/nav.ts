/**
 * Admin sidebar information architecture — operations-first CRM.
 * All existing authorized routes remain reachable; legacy hubs preserved.
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
  MessageSquare,
  ReceiptText,
  Settings,
  Sheet,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Emphasize in nav (e.g. New Customer). */
  emphasis?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  /** Start collapsed on desktop when true (user can expand). */
  defaultCollapsed?: boolean;
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
      { href: "/admin", label: "Dashboard", description: "Operations command center", icon: LayoutDashboard },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      {
        href: "/admin/customers/walk-in",
        label: "New Customer",
        description: "Walk-in phone-first create",
        icon: UserPlus,
        emphasis: true,
      },
      { href: "/admin/customers", label: "Customers", description: "Customer 360", icon: UsersRound },
    ],
  },
  {
    id: "leads-sales",
    label: "Leads & Sales",
    items: [
      { href: "/admin/leads", label: "Leads", description: "Pipeline, follow-ups, convert", icon: TrendingUp },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    items: [
      { href: "/admin/applications", label: "Applications", description: "Workflow engine", icon: ClipboardList },
      { href: ADMIN_SERVICES_ROUTE, label: "Services", description: "Catalog and pricing", icon: ListChecks },
    ],
  },
  {
    id: "team-partners",
    label: "Team & Partners",
    items: [
      { href: ADMIN_DIGI_PARTNERS_ROUTE, label: "Digi Partners", description: "KYC and partner CRM", icon: UserCheck },
      { href: "/admin/partner-banners", label: "Partner Banners", description: "Digi Partner home slider", icon: Image },
    ],
  },
  {
    id: "payments-finance",
    label: "Payments & Finance",
    items: [
      { href: "/admin/payments", label: "Payments", description: "Payment ledger", icon: ReceiptText },
      { href: "/admin/offline-invoices", label: "Offline Invoices", description: "Manual invoices", icon: FileText },
      { href: "/admin/wallet", label: "Wallet", description: "Liability ledger", icon: WalletCards },
      { href: "/admin/coupons", label: "Coupons", description: "Discount codes", icon: BadgePercent },
      { href: "/admin/ap-commissions", label: "Partner Commissions", description: "Approve to credit partner wallets", icon: ShieldCheck },
      { href: "/admin/commissions", label: "Agent Commissions", description: "Legacy agent ledger", icon: ShieldCheck },
      { href: "/admin/payment-reconciliation", label: "Reconciliation", description: "Razorpay match", icon: ReceiptText },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    items: [
      { href: "/admin/communications", label: "Communications", description: "WhatsApp outbox ops", icon: MessageSquare },
      { href: "/admin/notifications", label: "Notifications", description: "System alerts", icon: Bell },
      { href: "/admin/crm-sync", label: "CRM Sync Logs", description: "Google Sheets mirror", icon: Sheet },
    ],
  },
  {
    id: "automation-ai",
    label: "Automation & AI",
    items: [
      { href: "/admin/automation", label: "Automation", description: "Events, alerts, summaries", icon: Workflow },
      {
        href: "/admin/automation#insights",
        label: "AI Insights",
        description: "Deterministic insights · generative AI off until configured",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    defaultCollapsed: true,
    items: [
      { href: "/admin/reports", label: "Reports", description: "Operational reports", icon: BarChart3 },
      { href: "/admin/reports/dpr", label: "DPR Analytics", description: "DPR apps, revenue, schemes", icon: BarChart3 },
      { href: "/admin/reports/itr", label: "ITR Analytics", description: "ITR apps, revenue, filing stats", icon: BarChart3 },
      { href: ADMIN_HOMEPAGE_CMS_ROUTE, label: "Homepage CMS", description: "Banners and notices", icon: Image },
      { href: "/admin/services/dpr", label: "DPR CMS", description: "DPR landing sections & banners", icon: FileText },
      { href: "/admin/services/itr", label: "ITR CMS", description: "ITR landing sections & banners", icon: FileText },
      { href: "/admin/articles", label: "Articles", description: "Knowledge content", icon: FileText },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    defaultCollapsed: true,
    items: [
      { href: "/admin/settings", label: "Settings", description: "Platform settings", icon: Settings },
    ],
  },
];

export function flattenAdminNav(): AdminNavItem[] {
  return ADMIN_NAV_GROUPS.flatMap((group) => group.items).filter((item) => !item.href.includes("#"));
}

export function isAdminNavActive(pathname: string, href: string) {
  const base = href.split("#")[0] || href;
  if (base === "/admin") return pathname === "/admin";
  return pathname === base || pathname.startsWith(`${base}/`);
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
