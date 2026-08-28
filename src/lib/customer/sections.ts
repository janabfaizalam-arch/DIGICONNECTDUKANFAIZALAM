/**
 * The customer portal's sections.
 *
 * There were eight tabs: Dashboard, Applications, Wallet, Refer & Earn,
 * Documents Hub, Secure Vault, Support Center, Profile Settings. Two of those
 * pairs were one idea split in half — referral rewards *are* wallet money, and
 * both document screens held the customer's files — so a customer chasing
 * their cashback had to know which of two tabs it had landed in. (The Secure
 * Vault has since been removed outright, on the owner's instruction.)
 *
 * Six sections, each answering one question a customer actually arrives with:
 *
 *   home         — what is happening with my applications, and what do you
 *                  need from me?
 *   applications — all my filings
 *   wallet       — my money, referrals included
 *   help         — support, FAQs, and my credit reports
 *   account      — my details, security and preferences
 *
 * `LEGACY_TAB_SECTION` keeps every link that already exists working. The
 * bottom navigation, the site header and any bookmarked `?tab=` URL still
 * point at the old eight names; they resolve here rather than silently
 * falling back to the home screen.
 */

export const CUSTOMER_SECTIONS = ["home", "applications", "wallet", "help", "account"] as const;

export type CustomerSection = (typeof CUSTOMER_SECTIONS)[number];

/** Old tab name → the section that absorbed it. */
export const LEGACY_TAB_SECTION: Record<string, CustomerSection> = {
  dashboard: "home",
  applications: "applications",
  wallet: "wallet",
  referral: "wallet",
  // Documents no longer has a section: a filing's paperwork is on the filing
  // itself, at /customer/applications/[id]#documents. Both of these were real
  // URLs people could have bookmarked, so they resolve to the list of
  // applications — one tap from the file they were after — rather than
  // silently dropping them on the home screen.
  documents: "applications",
  vault: "applications",
  support: "help",
  profile: "account",
};

/**
 * Resolve a `?tab=` value to a section.
 *
 * Unknown values land on home rather than throwing: the parameter comes from
 * a URL, so anyone can type anything into it.
 */
export function resolveSection(tab: string | null | undefined): CustomerSection {
  const value = String(tab ?? "").trim().toLowerCase();
  if (!value) return "home";
  if ((CUSTOMER_SECTIONS as readonly string[]).includes(value)) return value as CustomerSection;
  return LEGACY_TAB_SECTION[value] ?? "home";
}

/**
 * The canonical URL for a section.
 *
 * Home has no parameter, so the dashboard's own address stays clean and the
 * bottom navigation's active-state check keeps working.
 */
export function sectionHref(section: CustomerSection): string {
  return section === "home" ? "/customer/dashboard" : `/customer/dashboard?tab=${section}`;
}

/**
 * Deep links within a section.
 *
 * A merged section keeps an anchor for the half that used to be its own tab,
 * so "Refer & Earn" stays linkable by name.
 */
export const SECTION_ANCHORS = {
  referral: "/customer/dashboard?tab=wallet#referral",
  security: "/customer/dashboard?tab=account#security",
} as const;
