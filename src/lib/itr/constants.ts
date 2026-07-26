export const ITR_SERVICE_SLUG = "itr-filing";
/** Preferred SEO alias — always resolves to ITR_SERVICE_SLUG */
export const ITR_SEO_ALIAS_SLUG = "income-tax-return-filing";
export const ITR_LANDING_PATH = `/services/${ITR_SERVICE_SLUG}`;
export const ITR_SEO_LANDING_PATH = `/services/${ITR_SEO_ALIAS_SLUG}`;
export const ITR_APPLY_PATH = `/apply/${ITR_SERVICE_SLUG}`;
export const ITR_SEO_APPLY_PATH = `/apply/${ITR_SEO_ALIAS_SLUG}`;
export const ITR_STARTING_PRICE = 499;
export const ITR_MEDIA_BUCKET = "itr-media";
export const ITR_ADMIN_PATH = "/admin/services/itr";
export const ITR_REPORTS_PATH = "/admin/reports/itr";

export const ITR_SECTION_KEYS = [
  "hero",
  "trust",
  "what_is",
  "who_should_file",
  "income_sources",
  "form_comparison",
  "benefits",
  "documents",
  "process",
  "pricing",
  "self_vs_expert",
  "why_us",
  "mistakes",
  "reviews",
  "trust_us",
  "faq",
  "related",
  "cta",
  "sticky_cta",
] as const;

export type ItrSectionKey = (typeof ITR_SECTION_KEYS)[number];

export function resolveItrServiceSlug(slug: string): string {
  if (slug === ITR_SEO_ALIAS_SLUG || slug === ITR_SERVICE_SLUG) return ITR_SERVICE_SLUG;
  return slug;
}

export function isItrServiceSlug(slug: string | null | undefined): boolean {
  return slug === ITR_SERVICE_SLUG || slug === ITR_SEO_ALIAS_SLUG;
}
