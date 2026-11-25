import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BookOpen,
  Building2,
  ClipboardList,
  Coins,
  FileText,
  GraduationCap,
  Handshake,
  LayoutGrid,
  LifeBuoy,
  Link2,
  Megaphone,
  Printer,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

/**
 * What the DC Partner panel contains, and where each thing lives.
 *
 * The panel had grown to thirty-odd screens behind a seven-link bar and one
 * enormous hard-coded menu. Half of them — the offline invoice book, the
 * knowledge base, the leads desk, the print counter, the marketing kit — were
 * reachable only by knowing the URL. That is the whole of "kuchh feature kahin
 * hain, kuchh kahin, kuchh dikh hi nahin rahe": nothing was missing, the doors
 * were.
 *
 * So the panel gets what the admin panel already has and for the same reason.
 * Every screen is either placed in a group below, or named in
 * {@link AP_ALIAS_ROUTES} as a redirect, or in {@link AP_DETAIL_ROUTES} as
 * something you reach from its parent. A contract test walks `src/app/dc-partner` and
 * fails the build if a screen is in none of them — a new screen cannot go
 * invisible the way these did.
 *
 * One map, four consumers: the sidebar on a computer, the bottom dock and its
 * "Sab kuch" sheet on a phone, the directory at /ap/all, and the search.
 */

export type ApNavItem = {
  href: string;
  label: string;
  /** One line, in plain words, of what the screen is for. */
  description: string;
  icon: LucideIcon;
  /** Shown in the bottom dock on a phone. At most five may set this. */
  dock?: boolean;
  /**
   * What the dock calls it, when the full label will not fit.
   *
   * A five-tab dock gives each label about 64px; "Applications" truncates to
   * "Applicati…", which is worse than a shorter word that is simply true.
   */
  dockLabel?: string;
  /** Only for partner types that can manage a team. */
  teamOnly?: boolean;
  /**
   * A screen that exists and works, but whose data is not wired end to end
   * yet. Said out loud on the directory rather than quietly linked, because
   * being led into a half-built screen is worse than being told.
   */
  partial?: string;
};

export type ApNavGroup = {
  id: string;
  /** What a shop owner would call this pile of screens. */
  label: string;
  blurb: string;
  icon: LucideIcon;
  items: ApNavItem[];
};

export const AP_NAV_GROUPS: ApNavGroup[] = [
  {
    id: "work",
    label: "Roz ka kaam",
    blurb: "Applications, customers and the work assigned to you.",
    icon: ClipboardList,
    items: [
      {
        href: "/dc-partner/dashboard",
        label: "Dashboard",
        dockLabel: "Home",
        description: "Today's work, earnings and what needs you first",
        icon: LayoutGrid,
        dock: true,
      },
      {
        href: "/dc-partner/applications",
        label: "Applications",
        dockLabel: "Apps",
        description: "Every application you have filed, and its stage",
        icon: FileText,
        dock: true,
      },
      {
        href: "/dc-partner/applications/new",
        label: "New application",
        description: "File a service for a customer, start to finish",
        icon: Sparkles,
      },
      {
        href: "/dc-partner/customers",
        label: "Customers",
        dockLabel: "People",
        description: "The people you serve, and everything filed for them",
        icon: UsersRound,
        dock: true,
      },
      {
        href: "/dc-partner/leads",
        label: "Leads",
        description: "Enquiries that have not become applications yet",
        icon: Handshake,
      },
      {
        href: "/dc-partner/assigned-work",
        label: "Assigned to me",
        description: "Work the office has handed to you by name",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "earn",
    label: "Kamai ke zariye",
    blurb: "The services you sell and the counters you run.",
    icon: Building2,
    items: [
      {
        href: "/dc-partner/services",
        label: "Service catalogue",
        description: "Everything you can sell, with your price and commission",
        icon: LayoutGrid,
      },
      {
        href: "/dc-partner/print",
        label: "Print counter",
        description: "Your printer on a QR — rates, key and the day's queue",
        icon: Printer,
      },
      {
        href: "/dc-partner/payment-links",
        label: "Payment links",
        description: "Send a customer a link and get paid without cash",
        icon: Link2,
      },
      {
        href: "/dc-partner/invoices/offline",
        label: "Offline invoices",
        description: "Bills for work taken in cash at the counter",
        icon: Receipt,
      },
      {
        href: "/dc-partner/referrals",
        label: "Referrals",
        description: "Your code, who joined with it, and what it earned",
        icon: Megaphone,
      },
      {
        href: "/dc-partner/marketing",
        label: "Marketing kit",
        description: "Posters and WhatsApp messages ready to forward",
        icon: Megaphone,
      },
    ],
  },
  {
    id: "money",
    label: "Paisa",
    blurb: "What you have earned, and getting it out.",
    icon: WalletCards,
    items: [
      {
        href: "/dc-partner/wallet",
        label: "Wallet",
        description: "Balance, credits and every rupee in and out",
        icon: WalletCards,
        dock: true,
      },
      {
        href: "/dc-partner/commissions",
        label: "Score",
        description: "What each completed service earned you",
        icon: Coins,
      },
      {
        href: "/dc-partner/payouts",
        label: "Payouts",
        description: "Withdrawals to your bank, and where each one is",
        icon: Banknote,
      },
    ],
  },
  {
    id: "you",
    label: "Aapka account",
    blurb: "Your details, your learning, and help when stuck.",
    icon: UserRound,
    items: [
      {
        href: "/dc-partner/profile",
        label: "Profile",
        description: "Your name, shop, contact and KYC status",
        icon: UserRound,
      },
      {
        href: "/dc-partner/documents",
        label: "My documents",
        description: "PAN, Aadhaar and anything else we hold for you",
        icon: ShieldCheck,
      },
      {
        href: "/dc-partner/training",
        label: "Training",
        description: "How each service works, step by step",
        icon: GraduationCap,
      },
      {
        href: "/dc-partner/support",
        label: "Help & support",
        description: "Raise a problem and see what we said",
        icon: LifeBuoy,
      },
      {
        href: "/dc-partner/notifications",
        label: "Notifications",
        description: "Everything the office has told you",
        icon: BookOpen,
        partial: "Notifications are kept in this browser, so they do not follow you to another device.",
      },
      {
        href: "/dc-partner/settings",
        label: "Settings",
        description: "How the panel behaves for you",
        icon: Settings,
      },
      {
        href: "/dc-partner/change-password",
        label: "Change password",
        description: "Set a new password for your login",
        icon: ShieldCheck,
      },
    ],
  },
];

/** Screens that only redirect somewhere else. Deliberately not in the nav. */
export const AP_ALIAS_ROUTES: Record<string, string> = {
  "/dc-partner": "/dc-partner/dashboard",
  "/dc-partner/knowledge": "/dc-partner/training",
  "/dc-partner/customers/new": "/dc-partner/applications/new",
  "/dc-partner/payments/collect": "/dc-partner/payment-links",
};

/** Reached from a parent screen (a row, a card), never from the nav. */
export const AP_DETAIL_ROUTES = [
  "/dc-partner/applications/[id]",
  "/dc-partner/customers/[id]",
  "/dc-partner/services/[slug]",
  "/dc-partner/all",
] as const;

/** Standalone auth screens: they hide every shell, so they are not placed. */
export const AP_AUTH_ROUTES = [
  "/dc-partner/login",
  "/dc-partner/forgot-password",
  "/dc-partner/reset-password",
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   Reading the map
   ───────────────────────────────────────────────────────────────────────── */

export function apNavItems(options: { canManageTeam?: boolean } = {}): ApNavItem[] {
  return AP_NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => !item.teamOnly || options.canManageTeam,
  );
}

export function apNavGroups(options: { canManageTeam?: boolean } = {}): ApNavGroup[] {
  return AP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.teamOnly || options.canManageTeam),
  })).filter((group) => group.items.length > 0);
}

/**
 * The five that live in the phone's bottom dock.
 *
 * Four, plus the "Sab kuch" button the dock adds itself — five in all.
 * Five is the limit, not a target: a sixth turns a dock into a menu, and a
 * menu at the bottom of a phone is where taps go to be missed. Everything
 * else is one tap away behind that button, including the profile.
 */
export function apDockItems(): ApNavItem[] {
  return apNavItems().filter((item) => item.dock).slice(0, 4);
}

/** The screen a path belongs to, for titles and active states. */
export function apActiveItem(pathname: string): ApNavItem | null {
  const items = apNavItems({ canManageTeam: true });

  // Longest match first, so /ap/applications/new does not answer as
  // /ap/applications.
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  return (
    sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? null
  );
}

export function isApNavItemActive(pathname: string, item: ApNavItem): boolean {
  const active = apActiveItem(pathname);
  return active?.href === item.href;
}

/**
 * Screens that bring their own bottom action bar (the new-application wizard).
 * The dock is hidden on them and the shell reserves no space for it: two bars
 * stacked at the bottom of a phone covered the form and left an empty band
 * under the last card.
 */
export function isApFullScreenFlow(pathname: string | null | undefined): boolean {
  return pathname === "/dc-partner/applications/new";
}
