/**
 * Canonical Admin → Agency Partner routes.
 * Detail pages always use agency_partners.id (UUID), never user_id or partner_code.
 */

export const ADMIN_AGENCY_PARTNERS_ROUTE = "/admin/agency-partners";
export const ADMIN_AGENCY_PARTNERS_NEW_ROUTE = "/admin/agency-partners/new";
export const ADMIN_AGENCY_PARTNERS_EXPORT_ROUTE = "/api/admin/agency-partners/export";

/** Excel export URL carrying the console's current search / partner-type filters. */
export function adminAgencyPartnerExportPath(filters?: {
  q?: string | null;
  type?: string | null;
}): string {
  const params = new URLSearchParams();
  const query = String(filters?.q ?? "").trim();
  const type = String(filters?.type ?? "").trim();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  const search = params.toString();
  return search
    ? `${ADMIN_AGENCY_PARTNERS_EXPORT_ROUTE}?${search}`
    : ADMIN_AGENCY_PARTNERS_EXPORT_ROUTE;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when value is a plausible agency_partners.id UUID. */
export function isAgencyPartnerId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && UUID_RE.test(trimmed);
}

/** Normalize a dynamic route param; returns null when malformed. */
export function parseAgencyPartnerIdParam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isAgencyPartnerId(trimmed) ? trimmed : null;
}

/** Canonical partner detail path: /admin/agency-partners/[partnerId] */
export function adminAgencyPartnerDetailPath(
  partnerId: string,
  options?: { tab?: string },
): string {
  const base = `${ADMIN_AGENCY_PARTNERS_ROUTE}/${partnerId}`;
  if (!options?.tab) return base;
  const tab = options.tab.trim();
  if (!tab) return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export const ADMIN_PARTNER_DETAIL_TABS = [
  "overview",
  "applications",
  "wallet",
  "commissions",
  "documents",
  "kyc",
  "activity",
  "settings",
] as const;

export type AdminPartnerDetailTab = (typeof ADMIN_PARTNER_DETAIL_TABS)[number];

export function parseAdminPartnerDetailTab(value: unknown): AdminPartnerDetailTab {
  const raw = String(value ?? "").trim().toLowerCase();
  if ((ADMIN_PARTNER_DETAIL_TABS as readonly string[]).includes(raw)) {
    return raw as AdminPartnerDetailTab;
  }
  return "overview";
}
