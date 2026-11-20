import type { LucideIcon } from "lucide-react";
import { FileText, House, UserRound, Users, WalletCards } from "lucide-react";

export type ApMobileNavItem = {
  key: "home" | "applications" | "customers" | "wallet" | "account";
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes (or exact paths) that activate this tab. */
  matchPaths: string[];
  /** When true, only exact matches on matchPaths count (used for Home). */
  exactOnly?: boolean;
};

export const AP_MOBILE_NAV_ITEMS: ApMobileNavItem[] = [
  {
    key: "home",
    label: "Home",
    href: "/dc-partner/dashboard",
    icon: House,
    matchPaths: ["/dc-partner/dashboard", "/dc-partner"],
    exactOnly: true,
  },
  {
    key: "applications",
    label: "Applications",
    href: "/dc-partner/applications",
    icon: FileText,
    matchPaths: ["/dc-partner/applications"],
  },
  {
    key: "customers",
    label: "Customers",
    href: "/dc-partner/customers",
    icon: Users,
    matchPaths: ["/dc-partner/customers"],
  },
  {
    key: "wallet",
    label: "Wallet",
    href: "/dc-partner/wallet",
    icon: WalletCards,
    matchPaths: ["/dc-partner/wallet"],
  },
  {
    key: "account",
    label: "Account",
    href: "/dc-partner/profile",
    icon: UserRound,
    matchPaths: ["/dc-partner/profile", "/dc-partner/settings", "/dc-partner/change-password", "/dc-partner/account"],
  },
];

function matchesPath(pathname: string, base: string, exactOnly?: boolean): boolean {
  if (exactOnly) {
    return pathname === base;
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Reliable active-tab matching for DC Partner mobile bottom nav.
 * Home is exact-only so nested partner routes do not steal the Home highlight.
 */
export function isNavItemActive(pathname: string, item: ApMobileNavItem): boolean {
  const path = pathname.split("?")[0] || pathname;

  if (item.exactOnly) {
    return item.matchPaths.some((base) => matchesPath(path, base, true));
  }

  return item.matchPaths.some((base) => matchesPath(path, base, false));
}

export function getActiveMobileNavKey(pathname: string): ApMobileNavItem["key"] | null {
  const active = AP_MOBILE_NAV_ITEMS.find((item) => isNavItemActive(pathname, item));
  return active?.key ?? null;
}
