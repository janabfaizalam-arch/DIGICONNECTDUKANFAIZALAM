/**
 * Homepage-only visual asset map for Option 3 fidelity.
 * Specific category matchers first — avoid duplicate Taj Mahal / city reuse.
 */

export const HOMEPAGE_HERO_DESKTOP = "/images/homepage/hero-assistance-desktop.webp";
export const HOMEPAGE_HERO_MOBILE = "/images/homepage/hero-assistance-mobile.webp";
export const HOMEPAGE_TRUST_ILLUSTRATION = "/images/homepage/illustrations/trust-secure.webp";
export const HOMEPAGE_TRACKING_ILLUSTRATION = "/images/homepage/illustrations/tracking-timeline.webp";
export const HOMEPAGE_REWARDS_ILLUSTRATION = "/images/homepage/illustrations/rewards-wallet.webp";
/** Partner CTA artwork — distinct from rewards wallet composition. */
export const HOMEPAGE_PARTNER_ILLUSTRATION = "/images/homepage/categories/company-compliance.webp";

export const HOMEPAGE_SERVICE_IMAGES: { match: RegExp; src: string }[] = [
  { match: /itr|income.?tax|tax.?return/i, src: "/images/homepage/services/itr-filing.webp" },
  { match: /gst/i, src: "/images/homepage/services/gst-registration.webp" },
  { match: /msme|udyam|startup/i, src: "/images/homepage/services/msme-registration.webp" },
  { match: /cibil|credit.?score|credit.?health/i, src: "/images/homepage/services/cibil-report.webp" },
  { match: /passport/i, src: "/images/homepage/services/passport-service.webp" },
  { match: /mudra|pmegp|vishwakarma|scheme|yojana|loan/i, src: "/images/homepage/categories/loans-schemes.webp" },
  { match: /insur|bike|motor|vehicle/i, src: "/images/homepage/categories/insurance.webp" },
  { match: /bill|recharge|utility|payment/i, src: "/images/homepage/services/bill-payments.webp" },
  { match: /pvc|smart.?card|aadhaar.?print/i, src: "/images/homepage/categories/cards-pvc.webp" },
  { match: /aadhaar|aadhar|hof.?update/i, src: "/images/homepage/categories/government.webp" },
  { match: /company|compliance|opc|private.?limited/i, src: "/images/homepage/categories/company-compliance.webp" },
];

/** Ordered most-specific → least-specific to prevent illustration collisions. */
export const HOMEPAGE_CATEGORY_ART: {
  match: RegExp;
  src: string;
  tone: string;
  border: string;
  iconTone: string;
  descriptor: string;
}[] = [
  {
    match: /pvc|card.?print|smart.?card|identity.?card|id.?card/,
    src: "/images/homepage/categories/cards-pvc.webp",
    tone: "bg-[#e8f8f1]",
    border: "border-[var(--dc-teal)]/25",
    iconTone: "bg-[var(--dc-teal)] text-white",
    descriptor: "PVC & identity printing",
  },
  {
    match: /passport|licence|license|driving|travel|tourism|vehicle/,
    src: "/images/homepage/categories/travel.webp",
    tone: "bg-rose-50",
    border: "border-rose-300/50",
    iconTone: "bg-rose-500 text-white",
    descriptor: "Passport, licence & travel",
  },
  {
    match: /tax|gst|itr|income.?tax/,
    src: "/images/homepage/categories/tax-gst.webp",
    tone: "bg-[var(--dc-orange-soft)]",
    border: "border-[var(--dc-orange-500)]/25",
    iconTone: "bg-[var(--dc-orange-500)] text-white",
    descriptor: "Tax, GST & filing support",
  },
  {
    match: /company|compliance|incorporation|roc|opc|private.?limited/,
    src: "/images/homepage/categories/company-compliance.webp",
    tone: "bg-[var(--dc-violet-soft)]",
    border: "border-[var(--dc-violet)]/25",
    iconTone: "bg-[var(--dc-violet)] text-white",
    descriptor: "Company & compliance",
  },
  {
    match: /loan|scheme|yojana|mudra|pmegp|vishwakarma|subsidy/,
    src: "/images/homepage/categories/loans-schemes.webp",
    tone: "bg-[var(--dc-teal-soft)]",
    border: "border-[var(--dc-teal)]/25",
    iconTone: "bg-[var(--dc-teal)] text-white",
    descriptor: "Loans & scheme assistance",
  },
  {
    match: /bank|finance|credit|wallet|cibil|account/,
    src: "/images/homepage/categories/banking-finance.webp",
    tone: "bg-[var(--dc-blue-soft)]",
    border: "border-[var(--dc-blue-500)]/25",
    iconTone: "bg-[var(--dc-blue-700)] text-white",
    descriptor: "Banking & credit support",
  },
  {
    match: /bill|recharge|utility|payment/,
    src: "/images/homepage/categories/bill-payments.webp",
    tone: "bg-[var(--dc-cream)]",
    border: "border-[var(--dc-orange-500)]/25",
    iconTone: "bg-[var(--dc-orange-500)] text-white",
    descriptor: "Recharge & utilities",
  },
  {
    match: /insur/,
    src: "/images/homepage/categories/insurance.webp",
    tone: "bg-[#fff1e8]",
    border: "border-[#ea580c]/25",
    iconTone: "bg-[#ea580c] text-white",
    descriptor: "Life, health & motor",
  },
  {
    match: /gov|document|certificate|id/,
    src: "/images/homepage/categories/government.webp",
    tone: "bg-[#e8f8f1]",
    border: "border-[var(--dc-teal)]/25",
    iconTone: "bg-[var(--dc-teal)] text-white",
    descriptor: "Certificates & IDs",
  },
];

export function resolveHomepageServiceImage(slug: string, title: string, cmsUrl?: string | null) {
  if (cmsUrl?.trim()) return cmsUrl.trim();
  const hay = `${slug} ${title}`;
  return HOMEPAGE_SERVICE_IMAGES.find((item) => item.match.test(hay))?.src ?? null;
}

export function resolveHomepageCategoryArt(slug: string, title: string) {
  const hay = `${slug} ${title}`.toLowerCase();
  return (
    HOMEPAGE_CATEGORY_ART.find((item) => item.match.test(hay)) ?? {
      match: /.*/,
      src: "/images/homepage/categories/business.webp",
      tone: "bg-[var(--dc-sky-soft)]",
      border: "border-[var(--dc-blue-500)]/20",
      iconTone: "bg-[var(--dc-blue-700)] text-white",
      descriptor: "Explore services",
    }
  );
}
