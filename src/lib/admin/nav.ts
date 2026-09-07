/**
 * What the admin panel contains, and where each thing lives.
 *
 * The panel had grown to sixty-odd screens reached through a single flat
 * sidebar, and twenty-five of them were not in that sidebar at all — the
 * gallery, the homepage slides, the social links, the branches console, the
 * print desk. They existed, they worked, and the only way to reach one was to
 * already know its URL. That is the whole of "kuchh to dikh hi nahin rahe":
 * the features were never missing, the doors were.
 *
 * Two things fix it and both live in this file.
 *
 * **Every screen is placed.** `ADMIN_WORKSPACES` below is the complete map of
 * the panel. A screen is either in a group here or named in
 * `ADMIN_CHILD_ROUTES` as something reached from its parent — and a contract
 * test walks `src/app/admin` and fails the build if a screen is in neither.
 * A new screen cannot become invisible the way these did.
 *
 * **Customer work and partner work are separated.** They were interleaved in
 * one list, so running the customer business meant reading past partner
 * payouts and commission rules to find the applications queue. There are two
 * workspaces now with a toggle between them: `customer`, which is the whole
 * customer-facing business, and `partner`, which is the Digi Partner and staff
 * side. The partner workspace is a move, not a build — the same screens as
 * before, gathered where they belong.
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgePercent,
  BanknoteArrowUp,
  BarChart3,
  Bell,
  CalendarClock,
  Building2,
  ClipboardList,
  Contact,
  FileSpreadsheet,
  FileText,
  FolderCheck,
  Gauge,
  Globe,
  IdCard,
  Image,
  LayoutDashboard,
  Lightbulb,
  LifeBuoy,
  ListChecks,
  MessageSquare,
  Newspaper,
  Percent,
  Printer,
  ReceiptText,
  ScrollText,
  Settings,
  Share2,
  Sheet,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  Workflow,
  HardHat,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────── */

export type AdminWorkspaceId = "customer" | "partner";

export type AdminNavItem = {
  href: string;
  label: string;
  /** One line, in plain words, saying what the screen is for. */
  description: string;
  icon: LucideIcon;
  /** Emphasised in the nav and on the workspace home. */
  emphasis?: boolean;
  /**
   * A screen that exists but is not wired to the database yet.
   *
   * These were previously just deleted from the nav, which is how the panel
   * ended up with screens nobody could find. Hiding a half-built feature and
   * linking to it as though it worked are both wrong: the support ticket desk
   * saves to `localStorage`, so answering a customer there loses the answer on
   * the next device. Marked ones are listed on the workspace home with a plain
   * "not connected yet" label and kept out of the sidebar, so you know it
   * exists, know not to rely on it, and are not led into it by accident.
   */
  unfinished?: string;
  /**
   * A working screen this business does not use.
   *
   * Deleting the code would throw away something that works and that another
   * shop might need; leaving it in the sidebar is what made the panel feel
   * "bhara hua". Marked ones are absent from the sidebar and the directory,
   * and the reason is written here so a later reader knows it was a decision
   * about this business rather than an oversight.
   */
  hidden?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  /** One line describing the group, shown on the workspace home. */
  blurb: string;
  icon: LucideIcon;
  defaultCollapsed?: boolean;
  items: AdminNavItem[];
};

export type AdminWorkspace = {
  id: AdminWorkspaceId;
  label: string;
  /** Shown under the label in the workspace switcher. */
  tagline: string;
  icon: LucideIcon;
  /** Where the toggle lands when this workspace is chosen. */
  home: string;
  groups: AdminNavGroup[];
};

/* ─────────────────────────────────────────────────────────────────────────
   Canonical routes
   ───────────────────────────────────────────────────────────────────────── */

export const ADMIN_DIGI_PARTNERS_ROUTE = "/admin/agency-partners";
export const ADMIN_SERVICES_ROUTE = "/admin/services";
export const ADMIN_HOMEPAGE_CMS_ROUTE = "/admin/homepage";
export const ADMIN_PARTNER_HOME = "/admin/partners";

/* ─────────────────────────────────────────────────────────────────────────
   Workspace 1 — the customer business
   ───────────────────────────────────────────────────────────────────────── */

const CUSTOMER_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    blurb: "Where the day starts.",
    icon: LayoutDashboard,
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Today's applications, payments and follow-ups at a glance",
        icon: Gauge,
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    blurb: "Everyone who has walked in or signed up.",
    icon: UsersRound,
    items: [
      {
        href: "/admin/customers",
        label: "Customers",
        description: "Search anybody, open their history, or add a walk-in",
        icon: Contact,
        emphasis: true,
      },
      {
        href: "/admin/documents",
        label: "Documents",
        description: "Files customers uploaded, waiting to be checked",
        icon: FileText,
        hidden: "Documents arrive on the application itself; there is no separate queue to work.",
      },
      {
        href: "/admin/tickets",
        label: "Support Tickets",
        description: "Questions and complaints raised from the portal",
        icon: LifeBuoy,
        unfinished: "Saves to this browser only — not to the database yet.",
      },
    ],
  },
  {
    id: "leads",
    label: "Leads & Sales",
    blurb: "People who asked but have not yet paid.",
    icon: TrendingUp,
    items: [
      {
        href: "/admin/leads",
        label: "Leads",
        description: "Enquiries to follow up and convert",
        icon: TrendingUp,
      },
      {
        href: "/admin/leads/pipeline",
        label: "Pipeline Board",
        description: "The same leads as columns you can drag between",
        icon: ListChecks,
        hidden: "The leads list is how this shop works its follow-ups; the board duplicates it.",
      },
    ],
  },
  {
    id: "work",
    label: "Work in progress",
    blurb: "Everything currently being filed.",
    icon: ClipboardList,
    items: [
      {
        href: "/admin/applications",
        label: "Applications",
        description: "Every filing and the stage it has reached",
        icon: ClipboardList,
        emphasis: true,
      },
      {
        href: "/admin/print-jobs",
        label: "Print Jobs",
        description: "PVC cards and prints queued at the shop",
        icon: Printer,
      },
      {
        href: "/admin/insurance-quotations",
        label: "Insurance Quotations",
        description: "Quotes raised for motor and health cover",
        icon: ShieldCheck,
      },
      {
        href: "/admin/credit-reports",
        label: "Credit Reports",
        description: "CIBIL pulls and the consultations that follow",
        icon: BarChart3,
        hidden: "CIBIL work is handled on WhatsApp by the finance desk, not from here.",
      },
    ],
  },
  {
    id: "catalogue",
    label: "Services",
    blurb: "What you sell, what it costs, and what you ask for it.",
    icon: ListChecks,
    items: [
      {
        href: ADMIN_SERVICES_ROUTE,
        label: "Services",
        description: "Every service page, its content, and its application questions",
        icon: ListChecks,
        emphasis: true,
      },
      {
        href: "/admin/service-builder",
        label: "Service Builder",
        description: "Build a new service end to end in one flow",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "website",
    label: "Website",
    blurb: "Everything a visitor sees on rnos.in, editable here.",
    icon: Globe,
    items: [
      {
        href: ADMIN_HOMEPAGE_CMS_ROUTE,
        label: "Homepage",
        description: "The banners and blocks on the front page",
        icon: LayoutDashboard,
      },
      {
        href: "/admin/homepage-slides",
        label: "Hero Slides",
        description: "The big rotating images at the top of the homepage",
        icon: Image,
      },
      {
        href: "/admin/homepage-notices",
        label: "Notices",
        description: "The announcement line above the header",
        icon: Bell,
      },
      {
        href: "/admin/homepage-offer-strip",
        label: "Offer Strip",
        description: "The running offer bar and what it advertises",
        icon: BadgePercent,
      },
      {
        href: "/admin/homepage/content",
        label: "FAQ & Testimonials",
        description: "Homepage questions and the reviews shown under them",
        icon: MessageSquare,
      },
      {
        href: "/admin/labour-schemes",
        label: "Labour Card Schemes",
        description: "Scheme amounts, conditions and when each was last verified",
        icon: HardHat,
      },
      {
        href: "/admin/gallery",
        label: "Gallery",
        description: "Photos used across the site",
        icon: Image,
      },
      {
        href: "/admin/about-page-images",
        label: "About Page Images",
        description: "Artwork on the About us page",
        icon: Image,
      },
      {
        href: "/admin/articles",
        label: "Blog & Guides",
        description: "Articles that appear under related services",
        icon: Newspaper,
      },
      {
        href: "/admin/social-links",
        label: "Social Links",
        description: "The handles linked from the footer",
        icon: Share2,
      },
      {
        href: "/admin/services/csc-olympiad",
        label: "CSC Olympiad Page",
        description: "Settings for the Olympiad landing page",
        icon: ScrollText,
        hidden: "The Olympiad page is not a service this shop runs.",
      },
    ],
  },
  {
    id: "content-engine",
    label: "AI Content Engine",
    blurb: "Idea se publish tak ka pura content loop, ek jagah.",
    icon: Sparkles,
    defaultCollapsed: true,
    items: [
      {
        href: "/admin/content-engine",
        label: "Content Engine",
        description: "Pipeline, is hafte ke numbers, aur jo aapki approval ka intezaar kar raha hai",
        icon: Sparkles,
        emphasis: true,
      },
      {
        href: "/admin/content-engine/ideas",
        label: "Ideas",
        description: "Ranked idea bank — agla post kahan se aayega",
        icon: Lightbulb,
      },
      {
        href: "/admin/content-engine/approval",
        label: "Approvals",
        description: "Content, claims aur design ek saath, publish se pehle",
        icon: FolderCheck,
      },
      {
        href: "/admin/content-engine/calendar",
        label: "Content Calendar",
        description: "Kya kab kis platform par jaayega",
        icon: CalendarClock,
      },
      {
        href: "/admin/content-engine/analytics",
        label: "Content Analytics",
        description: "Har post ne kya kiya, aur uska agle hafte par asar",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    blurb: "What came in, what is owed, and what was discounted.",
    icon: WalletCards,
    items: [
      {
        href: "/admin/payments",
        label: "Payments",
        description: "Every payment taken, online and at the counter",
        icon: ReceiptText,
      },
      {
        href: "/admin/offline-invoices",
        label: "Offline Invoices",
        description: "Bills raised by hand for walk-in work",
        icon: FileSpreadsheet,
      },
      {
        href: "/admin/wallet",
        label: "Wallet & Cashback",
        description: "Customer wallet balances and the cashback you owe",
        icon: WalletCards,
      },
      {
        href: "/admin/coupons",
        label: "Coupons",
        description: "Discount codes and how often each has been used",
        icon: BadgePercent,
      },
      {
        href: "/admin/referrals",
        label: "Referrals & Pay Links",
        description: "Referral codes and one-off payment links",
        icon: Share2,
      },
      {
        href: "/admin/payment-reconciliation",
        label: "Reconciliation",
        description: "Match what Razorpay says against what you recorded",
        icon: Sheet,
      },
    ],
  },
  {
    id: "messages",
    label: "Messages",
    blurb: "What the system sends, and whether it arrived.",
    icon: MessageSquare,
    items: [
      {
        href: "/admin/communications",
        label: "WhatsApp Outbox",
        description: "Messages sent to customers and their delivery state",
        icon: MessageSquare,
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        description: "Alerts the system raised for you",
        icon: Bell,
      },
      {
        href: "/admin/crm-sync",
        label: "Sheet Sync Log",
        description: "What was mirrored to Google Sheets, and what failed",
        icon: Sheet,
      },
      {
        href: "/admin/diagnostics/otp",
        label: "OTP Delivery",
        description: "Why a signup OTP did or did not reach WhatsApp",
        icon: Stethoscope,
      },
    ],
  },
  {
    id: "insight",
    label: "Reports & Automation",
    blurb: "What the numbers say, and what runs on its own.",
    icon: BarChart3,
    defaultCollapsed: true,
    items: [
      {
        href: "/admin/analytics",
        label: "Website visitors",
        description: "Who opened the site, from where, and which pages they read",
        icon: Activity,
        emphasis: true,
      },
      {
        href: "/admin/reports",
        label: "Reports",
        description: "Revenue, volumes and conversion over a date range",
        icon: BarChart3,
      },
      {
        href: "/admin/reports/dpr",
        label: "DPR Analytics",
        description: "DPR applications, revenue and scheme split",
        icon: BarChart3,
        hidden: "The Reports screen already covers DPR; a service-specific analytics page is not used.",
      },
      {
        href: "/admin/reports/itr",
        label: "ITR Analytics",
        description: "ITR applications, revenue and filing stats",
        icon: BarChart3,
        hidden: "The Reports screen already covers ITR; a service-specific analytics page is not used.",
      },
      {
        href: "/admin/automation",
        label: "Automation",
        description: "Rules that fire on an event without you touching it",
        icon: Workflow,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    blurb: "How the platform itself behaves.",
    icon: Settings,
    defaultCollapsed: true,
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        description: "Business details, contact numbers and defaults",
        icon: Settings,
      },
      {
        href: "/admin/settings/core-config",
        label: "Core Config",
        description: "Templates and low-level switches",
        icon: Workflow,
        unfinished: "The save button does not persist anything yet.",
      },
      {
        href: "/admin/settings/saas",
        label: "Plans & Billing",
        description: "Subscription tiers and what each unlocks",
        icon: BadgePercent,
        hidden: "There are no subscription tiers to sell — this is one shop, not a SaaS.",
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Workspace 2 — partners and staff
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A move, not a build.
 *
 * Every screen here already existed and already worked; it was sitting in the
 * customer sidebar making that list longer. Nothing new is added until the
 * partner side is designed on its own terms.
 */
const PARTNER_GROUPS: AdminNavGroup[] = [
  {
    id: "partner-overview",
    label: "Overview",
    blurb: "What this workspace holds.",
    icon: LayoutDashboard,
    items: [
      {
        href: ADMIN_PARTNER_HOME,
        label: "Partner Home",
        description: "Every partner and commission screen, in one list",
        icon: Gauge,
      },
    ],
  },
  {
    id: "partners",
    label: "Digi Partners",
    blurb: "The people selling on your behalf.",
    icon: UserCheck,
    items: [
      {
        href: ADMIN_DIGI_PARTNERS_ROUTE,
        label: "Digi Partners",
        description: "Every partner, their KYC and their performance",
        icon: UserCheck,
        emphasis: true,
      },
      {
        href: "/admin/partner-applications",
        label: "Applications to Join",
        description: "New partner signups waiting to be approved",
        icon: UserPlus,
      },
      {
        href: "/admin/partner-banners",
        label: "Partner Banners",
        description: "The slider on the partner app's home screen",
        icon: Image,
      },
      {
        // Belongs with the partners who sell from it, not with the customer
        // catalogue — it carries their pricing, not the shop's.
        href: "/admin/agent-services",
        label: "Agent Catalogue",
        description: "The list partners sell from, with their own pricing",
        icon: IdCard,
      },
    ],
  },
  {
    id: "earnings",
    label: "Commissions & Payouts",
    blurb: "What partners earn and how it reaches them.",
    icon: Percent,
    items: [
      {
        href: "/admin/commission-rules",
        label: "Commission Rules",
        description: "What a partner earns on each service",
        icon: Percent,
      },
      {
        href: "/admin/ap-commissions",
        label: "Partner Commissions",
        description: "Approve earnings to credit a partner's wallet",
        icon: ShieldCheck,
      },
      {
        href: "/admin/ap-payouts",
        label: "Partner Payouts",
        description: "Pay or reject withdrawal requests",
        icon: BanknoteArrowUp,
      },
      {
        href: "/admin/commissions",
        label: "Agent Commissions",
        description: "The older agent commission ledger, kept for history",
        icon: ReceiptText,
      },
    ],
  },
  {
    id: "network",
    label: "Network",
    blurb: "Where your people are.",
    icon: Building2,
    items: [
      {
        href: "/admin/branches",
        label: "Branches",
        description: "Regional offices and who runs each",
        icon: Building2,
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   The map
   ───────────────────────────────────────────────────────────────────────── */

export const ADMIN_WORKSPACES: AdminWorkspace[] = [
  {
    id: "customer",
    label: "Customer",
    tagline: "The shop, the website and everyone you file for",
    icon: UsersRound,
    home: "/admin",
    groups: CUSTOMER_GROUPS,
  },
  {
    id: "partner",
    label: "Partners & Staff",
    tagline: "Digi Partners, commissions and branches",
    icon: UserCheck,
    home: ADMIN_PARTNER_HOME,
    groups: PARTNER_GROUPS,
  },
];

/**
 * Screens reached from inside another screen rather than from the nav.
 *
 * A create form opened by the "New" button on its list, a redirect kept so an
 * old bookmark still works, the signed-out login page. These are deliberately
 * absent from the sidebar; the contract test checks this list so that being
 * absent is always a decision somebody wrote down.
 */
export const ADMIN_CHILD_ROUTES: { href: string; reachedFrom: string }[] = [
  { href: "/admin/login", reachedFrom: "signed out" },
  { href: "/admin/customers/new", reachedFrom: "/admin/customers" },
  { href: "/admin/customers/walk-in", reachedFrom: "/admin/customers" },
  { href: "/admin/services/dpr", reachedFrom: "/admin/services — the DPR service's page content" },
  { href: "/admin/services/itr", reachedFrom: "/admin/services — the ITR service's page content" },
  { href: "/admin/articles/new", reachedFrom: "/admin/articles" },
  { href: "/admin/offline-invoices/new", reachedFrom: "/admin/offline-invoices" },
  { href: "/admin/services/new", reachedFrom: "/admin/services" },
  { href: "/admin/services/new-v5", reachedFrom: "/admin/services" },
  { href: "/admin/service-builder/create", reachedFrom: "/admin/service-builder" },
  { href: "/admin/agency-partners/new", reachedFrom: ADMIN_DIGI_PARTNERS_ROUTE },
  { href: "/admin/agents", reachedFrom: `redirect → ${ADMIN_DIGI_PARTNERS_ROUTE}` },
  { href: "/admin/agents/new", reachedFrom: `redirect → ${ADMIN_DIGI_PARTNERS_ROUTE}/new` },
  { href: "/admin/cashback", reachedFrom: "redirect → /admin/wallet" },
  { href: "/admin/rewards", reachedFrom: "redirect → /admin/wallet" },
  { href: "/admin/rewards-referrals", reachedFrom: "redirect → /admin/wallet" },

  /*
    The Content Engine's working screens.

    Five of its twelve are in the sidebar above — the overview, the idea bank,
    approvals, the calendar and analytics — because those are the ones somebody
    opens on purpose. The seven below are stages you arrive at from the tab bar
    inside the engine, or from a button on the screen before them: nobody
    navigates to "angles" from a cold start, they get there having just picked
    an idea. They are named here so that being absent from the sidebar stays a
    decision somebody wrote down rather than the accident that once left
    twenty-five admin screens with no door at all.
  */
  { href: "/admin/content-engine/angles", reachedFrom: "/admin/content-engine/ideas — after picking an idea" },
  { href: "/admin/content-engine/drafts", reachedFrom: "/admin/content-engine/angles — after picking a hook" },
  { href: "/admin/content-engine/fact-check", reachedFrom: "/admin/content-engine — the Content Engine tab bar" },
  { href: "/admin/content-engine/designs", reachedFrom: "/admin/content-engine — the Content Engine tab bar" },
  { href: "/admin/content-engine/repurpose", reachedFrom: "/admin/content-engine — the Content Engine tab bar" },
  { href: "/admin/content-engine/brand", reachedFrom: "/admin/content-engine — the Content Engine tab bar" },
  { href: "/admin/content-engine/settings", reachedFrom: "/admin/content-engine — the Content Engine tab bar" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Lookups
   ───────────────────────────────────────────────────────────────────────── */

export function getAdminWorkspace(id: AdminWorkspaceId): AdminWorkspace {
  return ADMIN_WORKSPACES.find((workspace) => workspace.id === id) ?? ADMIN_WORKSPACES[0];
}

/** Every nav item across both workspaces, finished or not. */
export function flattenAdminNav(): AdminNavItem[] {
  return ADMIN_WORKSPACES.flatMap((workspace) =>
    workspace.groups.flatMap((group) => group.items),
  ).filter((item) => !item.href.includes("#"));
}

/**
 * A workspace's groups with the unfinished screens removed.
 *
 * What the sidebar draws. The workspace home still lists them, labelled, so
 * they are visible without being a route somebody takes by mistake.
 */
export function navigableGroups(workspace: AdminWorkspace): AdminNavGroup[] {
  return workspace.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.unfinished && !item.hidden),
    }))
    .filter((group) => group.items.length);
}

/** The screens this business has switched off, and why. */
export function hiddenAdminScreens(): { href: string; label: string; reason: string }[] {
  return flattenAdminNav()
    .filter((item) => item.hidden)
    .map((item) => ({ href: item.href, label: item.label, reason: item.hidden! }));
}

/** Every route the nav offers, plus the child routes it deliberately omits. */
export function allAdminRoutes(): string[] {
  return [
    ...flattenAdminNav().map((item) => item.href),
    ...ADMIN_CHILD_ROUTES.map((route) => route.href),
  ];
}

export function isAdminNavActive(pathname: string, href: string) {
  const base = href.split("#")[0] || href;
  if (base === "/admin") return pathname === "/admin";
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Which workspace a path belongs to.
 *
 * Longest match wins, so `/admin/agency-partners` resolves to the partner
 * workspace rather than to `/admin`, which every path starts with. A path in
 * neither — a child route, an unknown page — stays in the customer workspace,
 * which is the one somebody is in by default.
 */
export function workspaceForPath(pathname: string): AdminWorkspaceId {
  let best: { id: AdminWorkspaceId; length: number } | null = null;

  for (const workspace of ADMIN_WORKSPACES) {
    for (const group of workspace.groups) {
      for (const item of group.items) {
        const base = item.href.split("#")[0] || item.href;
        if (base === "/admin") continue;
        if (!isAdminNavActive(pathname, base)) continue;
        if (!best || base.length > best.length) best = { id: workspace.id, length: base.length };
      }
    }
  }

  return best?.id ?? "customer";
}

export function resolveAdminBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const workspace = getAdminWorkspace(workspaceForPath(pathname));
  const crumbs: { label: string; href?: string }[] = [{ label: "Admin", href: "/admin" }];

  if (pathname === "/admin") {
    crumbs.push({ label: "Dashboard" });
    return crumbs;
  }

  if (workspace.id !== "customer") {
    crumbs.push({ label: workspace.label, href: workspace.home });
  }

  // The most specific nav item that covers this path, so a detail page shows
  // its list rather than a slug on its own.
  const match = flattenAdminNav()
    .filter((item) => item.href !== "/admin" && isAdminNavActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) {
    crumbs.push({ label: match.label, href: match.href });
    const rest = pathname.slice(match.href.length).split("/").filter(Boolean);
    if (rest.length) crumbs.push({ label: rest[rest.length - 1] });
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
