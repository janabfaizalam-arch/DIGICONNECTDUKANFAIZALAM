/**
 * RNOS Digital packages: the shapes shared by the database layer, the public
 * pages and the admin panel.
 *
 * Money is always integer paise. A rupee figure only exists at the edges —
 * typed into an admin form, or formatted for display — so no float ever takes
 * part in a sum.
 *
 * This file has no imports on purpose: the seed generator runs it under plain
 * Node, and client components import it for types.
 */

export const FEATURE_GROUPS = [
  { id: "website", label: "Website & design" },
  { id: "commerce", label: "E-commerce" },
  { id: "platform", label: "Software, CRM & automation" },
  { id: "growth", label: "SEO, analytics & marketing" },
  { id: "care", label: "Maintenance & support" },
] as const;

export type FeatureGroup = (typeof FEATURE_GROUPS)[number]["id"];

export const ADDON_UNITS = ["one_time", "monthly", "per_page", "per_product"] as const;
export type AddonUnit = (typeof ADDON_UNITS)[number];

export type PlanFeature = {
  /** Stable key that lines the same capability up across plans in the comparison table. */
  key: string;
  /** What the plan card and detail page say, e.g. "Up to 10-page website". */
  label: string;
  /** The comparison table's row heading, e.g. "Website pages". */
  compareLabel: string;
  /** Short cell text, e.g. "10 pages". Null means a plain tick. */
  value: string | null;
  group: FeatureGroup;
  /** Shown as a bullet on the plan card. */
  highlight: boolean;
};

export type PlanLimit = { label: string; value: string };
export type PlanFaq = { question: string; answer: string };

export type DigitalPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  monthlyPricePaise: number;
  setupFeePaise: number;
  /** "₹14,999 onwards": the price is a floor, the quotation sets the figure. */
  priceIsStarting: boolean;
  commitmentMonths: number;
  isRecommended: boolean;
  isActive: boolean;
  featuredOnHomepage: boolean;
  sortOrder: number;
  features: PlanFeature[];
  limits: PlanLimit[];
  exclusions: string[];
  maintenance: string;
  terms: string;
  faqs: PlanFaq[];
  addonSlugs: string[];
};

export type DigitalAddon = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pricePaise: number;
  unit: AddonUnit;
  priceIsStarting: boolean;
  note: string | null;
  isActive: boolean;
  sortOrder: number;
};

export const ENQUIRY_STATUSES = ["new", "contacted", "quoted", "approved", "declined", "won", "lost"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quotation sent",
  approved: "Approved by customer",
  declined: "Declined by customer",
  won: "Active client",
  lost: "Closed — not proceeding",
};

export type QuoteLine = { label: string; amountPaise: number; unit: AddonUnit };

export type DigitalEnquiry = {
  id: string;
  reference: string;
  planId: string | null;
  planSlug: string;
  planName: string;
  /** Prices as they were when the customer enquired — never re-read from the plan. */
  monthlyPricePaise: number;
  setupFeePaise: number;
  priceIsStarting: boolean;
  commitmentMonths: number;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  requirements: string | null;
  addonSlugs: string[];
  leadId: string | null;
  status: EnquiryStatus;
  quoteMonthlyPaise: number | null;
  quoteSetupPaise: number | null;
  quoteLines: QuoteLine[];
  quoteGstPercent: number;
  quoteCommitmentMonths: number | null;
  quoteNotes: string | null;
  quoteValidUntil: string | null;
  quoteToken: string | null;
  quotedAt: string | null;
  approvedAt: string | null;
  approvalName: string | null;
  declinedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};
