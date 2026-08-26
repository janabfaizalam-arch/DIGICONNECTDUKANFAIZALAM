/**
 * Shared search / type filtering for the admin Digi Partner list.
 *
 * The console page and the Excel export both run this, so a download always
 * contains exactly the rows the admin is looking at.
 */

import type { APListItem } from "@/lib/ap-types";
import { normalizePartnerType, partnerTypeDisplayLabel } from "@/lib/ap/partner-type";

export type AgencyPartnerFilters = {
  /** Free-text query across name, contact, code, shop and location. */
  query: string;
  /** Canonical partner type, or null for "all partner types". */
  type: ReturnType<typeof normalizePartnerType>;
};

export function parseAgencyPartnerFilters(input: {
  q?: string | null;
  type?: string | null;
}): AgencyPartnerFilters {
  return {
    query: String(input.q ?? "").trim(),
    type: normalizePartnerType(String(input.type ?? "").trim()),
  };
}

export function matchesAgencyPartnerSearch(ap: APListItem, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystack = [
    ap.full_name,
    ap.mobile,
    ap.email,
    ap.partner_code,
    ap.business_name,
    ap.address,
    ap.district,
    ap.state,
    partnerTypeDisplayLabel(ap.partner_type),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(trimmed.toLowerCase());
}

export function filterAgencyPartners(
  partners: APListItem[],
  filters: AgencyPartnerFilters,
): APListItem[] {
  return partners.filter((ap) => {
    if (filters.type && normalizePartnerType(ap.partner_type) !== filters.type) return false;
    return matchesAgencyPartnerSearch(ap, filters.query);
  });
}
