/**
 * Single source of truth for Digi Partner (Agency Partner / AP) access.
 *
 * Naming policy:
 *   - Public-facing label:  "Digi Partner"
 *   - Internal/admin label:  "Agency Partner (AP)"
 *   - The legacy word "Agent" is only kept for backward-compatible role values
 *     and legacy route redirects — never shown in new public UI.
 */

/** Public Digi Partner marketing / onboarding landing page. */
export const DIGI_PARTNER_LANDING_ROUTE = "/digi-partner";

/** The one canonical Digi Partner login route. */
export const DIGI_PARTNER_LOGIN_ROUTE = "/ap/login";

/** Public self-signup form for people who want to become a partner. */
export const DIGI_PARTNER_APPLY_ROUTE = "/digi-partner/apply";

/** Where an authenticated, active Digi Partner lands after login. */
export const DIGI_PARTNER_DASHBOARD_ROUTE = "/ap/dashboard";

/** Public label shown in navbars, footers, menus, and CTAs. */
export const DIGI_PARTNER_LABEL = "Digi Partner";

/** Public CTA label for signing in. */
export const DIGI_PARTNER_CTA_LABEL = "Digi Partner Login";

/** Public CTA label for becoming a partner. */
export const DIGI_PARTNER_BECOME_CTA_LABEL = "Become a Digi Partner";

/**
 * Legacy / alternate partner login URLs that must permanently redirect to the
 * canonical {@link DIGI_PARTNER_LOGIN_ROUTE}. Kept lowercase & normalized.
 */
export const PARTNER_LOGIN_ALIASES = [
  "/agent/login",
  "/partner/login",
  "/digi-partner/login",
  "/agency-partner/login",
] as const;

/**
 * Legacy role names that all resolve to a Digi Partner (agency_partner).
 * Access is always verified server-side against approval/active status — these
 * values only normalize labels, they never grant access on their own.
 */
export const PARTNER_ROLE_ALIASES = ["agent", "agency_partner", "ap"] as const;

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const [withoutQuery] = pathname.split("?");
  const [clean] = withoutQuery.split("#");
  const lower = clean.toLowerCase();
  if (lower.length > 1 && lower.endsWith("/")) {
    return lower.replace(/\/+$/, "");
  }
  return lower;
}

/**
 * Returns the canonical partner login route when `pathname` is a legacy partner
 * login alias, otherwise `null`. Safe against trailing slashes, query strings,
 * hashes and casing.
 */
export function resolvePartnerLoginAlias(pathname: string): string | null {
  const normalized = normalizePath(pathname);
  return (PARTNER_LOGIN_ALIASES as readonly string[]).includes(normalized)
    ? DIGI_PARTNER_LOGIN_ROUTE
    : null;
}

/**
 * Normalizes any known partner role value to the internal `agency_partner`.
 * Returns `null` for non-partner roles.
 */
export function normalizePartnerRole(role: unknown): "agency_partner" | null {
  const value = String(role ?? "").trim().toLowerCase();
  return (PARTNER_ROLE_ALIASES as readonly string[]).includes(value) ? "agency_partner" : null;
}

export type PartnerCtaRole = "guest" | "customer" | "agency_partner" | "admin";

export type PartnerCtaResult = {
  /** Where to send the visitor. */
  href: string;
  /**
   * When true, the visitor may stay on `/ap/login` but should be shown the
   * "signed in as a customer" switch notice.
   */
  showCustomerNotice: boolean;
};

/**
 * Smart destination for the "Digi Partner Login" CTA / route based on the
 * visitor's current session role / memberships.
 *
 *   guest            -> /ap/login
 *   agency_partner   -> /ap/dashboard
 *   admin + partner  -> /ap/dashboard (portal context: Digi Partner CTA)
 *   admin only       -> /ap/login (explicit switch; do not trap on /admin)
 *   customer         -> /ap/login (allowed, with a switch notice)
 *
 * Pass `hasPartnerMembership` when known so dual-role admins are not sent to /admin.
 */
export function resolvePartnerCtaDestination(
  role: PartnerCtaRole,
  options?: { hasPartnerMembership?: boolean },
): PartnerCtaResult {
  const hasPartner = options?.hasPartnerMembership === true;

  if (role === "agency_partner" || hasPartner) {
    return { href: DIGI_PARTNER_DASHBOARD_ROUTE, showCustomerNotice: false };
  }

  switch (role) {
    case "admin":
      // Admin-only users must explicitly use Digi Partner login (separate identity or membership).
      return { href: DIGI_PARTNER_LOGIN_ROUTE, showCustomerNotice: false };
    case "customer":
      return { href: DIGI_PARTNER_LOGIN_ROUTE, showCustomerNotice: true };
    case "guest":
    default:
      return { href: DIGI_PARTNER_LOGIN_ROUTE, showCustomerNotice: false };
  }
}
