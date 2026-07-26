export const DPR_SERVICE_SLUG = "detailed-project-report";
export const DPR_LANDING_PATH = `/services/${DPR_SERVICE_SLUG}`;
export const DPR_APPLY_PATH = `/apply/${DPR_SERVICE_SLUG}`;
export const DPR_LAUNCH_PRICE = 399;
export const DPR_MEDIA_BUCKET = "dpr-service-media";

export const DPR_SECTION_KEYS = [
  "hero",
  "trust",
  "what_is",
  "video",
  "why_us",
  "schemes",
  "includes",
  "pricing",
  "comparison",
  "process",
  "samples",
  "reviews",
  "success",
  "faq",
  "trust_badges",
  "documents",
  "benefits",
  "stats",
  "cta",
  "related",
  "contact",
  "sticky_cta",
] as const;

export type DprSectionKey = (typeof DPR_SECTION_KEYS)[number];
