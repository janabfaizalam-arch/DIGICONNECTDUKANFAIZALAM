/**
 * Operational metadata the catalogue itself does not carry.
 *
 * This file replaces a map that also held a `rating` and a `reviewsCount` for
 * every service — 4.9 stars, 890 reviews, and so on for twenty-five entries,
 * all of them typed by hand and rendered to customers as though real people
 * had left them. They were not real. The same map fed a "Top Rated" sort, so
 * the ordering was invented too, and a `popularityScore` presented as data
 * rather than as the editorial weight it is.
 *
 * What is left is what the company can actually stand behind:
 *
 *   • `processingTime` — the turnaround RNOS quotes for that filing. An
 *     operational estimate the team controls, not a claim about anyone else.
 *   • `eligibility` — who the scheme or document is open to. A fact about the
 *     government programme, checkable against its own guidelines.
 *   • `weight` — a curation weight for default ordering only. It is never
 *     printed, never labelled a score, and never presented as a measurement.
 *
 * Anything added here later has to clear the same bar the homepage holds: if a
 * customer could reasonably read it as a measurement, it needs a real source.
 */

export type ServiceDirectoryMeta = {
  processingTime: string;
  eligibility: string;
  /** Ordering weight for the default "Most requested" sort. Never displayed. */
  weight: number;
  isTrending?: boolean;
  isNew?: boolean;
};

export const SERVICE_DIRECTORY_META: Record<string, ServiceDirectoryMeta> = {
  "pvc-card": {
    processingTime: "2–4 days",
    eligibility: "Open to all Indian citizens with a valid digital card",
    weight: 98,
    isTrending: true,
  },
  "voter-id": {
    processingTime: "7–15 days",
    eligibility: "Indian citizens aged 18 or above",
    weight: 85,
    isNew: true,
  },
  "eshram-card": {
    processingTime: "1–2 days",
    eligibility: "Unorganised workers aged 16–59",
    weight: 92,
    isTrending: true,
  },
  "labour-card": {
    processingTime: "5–7 days",
    eligibility: "Construction and unorganised manual workers",
    weight: 89,
  },
  "pmegp-loan": {
    processingTime: "15–30 days",
    eligibility: "Aged 18+; Class 8 pass for larger projects",
    weight: 94,
    isTrending: true,
  },
  "mudra-loan": {
    processingTime: "10–20 days",
    eligibility: "Micro and small business owners and traders",
    weight: 95,
    isTrending: true,
  },
  "pm-vishwakarma-yojana": {
    processingTime: "3–5 days",
    eligibility: "Traditional artisans and craftspeople across the 18 listed trades",
    weight: 96,
    isTrending: true,
  },
  "startup-india-assistance": {
    processingTime: "7–10 days",
    eligibility: "Partnerships, LLPs and private limited companies",
    weight: 80,
  },
  "cm-yuva-entrepreneur-loan-assistance": {
    processingTime: "15–20 days",
    eligibility: "Indian youth and small business operators",
    weight: 97,
    isTrending: true,
  },
  "credit-cards": {
    processingTime: "2–5 days",
    eligibility: "Salaried or self-employed applicants aged 21–60",
    weight: 99,
    isTrending: true,
  },
  "saving-account-opening": {
    processingTime: "1 day",
    eligibility: "Indian residents aged 18 or above",
    weight: 90,
  },
  "current-account-opening": {
    processingTime: "2–3 days",
    eligibility: "Sole proprietorships, partnerships and corporate entities",
    weight: 88,
  },
  "cibil-report-increase": {
    processingTime: "5–7 days",
    eligibility: "Anyone tracking or disputing their credit bureau record",
    weight: 98,
    isTrending: true,
  },
  passport: {
    processingTime: "15–30 days",
    eligibility: "Indian citizens with address and identity proof",
    weight: 93,
    isTrending: true,
  },
  "learning-driving-license": {
    processingTime: "3–5 days",
    eligibility: "Indian residents aged 16+ (gearless) or 18+ (with gear)",
    weight: 94,
    isTrending: true,
  },
  "gst-registration": {
    processingTime: "3–5 days",
    eligibility: "Businesses crossing the tax threshold, or registering voluntarily",
    weight: 99,
    isTrending: true,
  },
  "gst-return-filing": {
    processingTime: "1–2 days",
    eligibility: "Holders of an existing GST registration certificate",
    weight: 95,
    isTrending: true,
    isNew: true,
  },
  "itr-filing": {
    processingTime: "1–2 days",
    eligibility: "Taxpayers with taxable income or a filing obligation",
    weight: 99,
    isTrending: true,
  },
  "private-limited-registration": {
    processingTime: "7–10 days",
    eligibility: "Minimum two directors and two shareholders",
    weight: 91,
  },
  "private-limited-compliance": {
    processingTime: "5–7 days",
    eligibility: "Registered private limited companies in India",
    weight: 83,
  },
  "opc-registration": {
    processingTime: "7–10 days",
    eligibility: "A single Indian resident promoter and one nominee",
    weight: 81,
  },
  dsc: {
    processingTime: "1–2 days",
    eligibility: "Individuals or authorised representatives of an organisation",
    weight: 87,
  },
  "msme-registration": {
    processingTime: "1–2 days",
    eligibility: "Micro, small and medium business proprietors",
    weight: 95,
    isTrending: true,
  },
  "iso-certification": {
    processingTime: "5–7 days",
    eligibility: "Indian entities seeking a standards compliance audit",
    weight: 78,
  },
  insurance: {
    processingTime: "1 day",
    eligibility: "Indian vehicle owners with a valid registration certificate",
    weight: 92,
    isTrending: true,
  },
};

const FALLBACK: ServiceDirectoryMeta = {
  processingTime: "3–7 days",
  eligibility: "Open to Indian residents with valid documentation",
  weight: 70,
};

export function directoryMeta(slug: string): ServiceDirectoryMeta {
  return SERVICE_DIRECTORY_META[slug] ?? FALLBACK;
}

/** Days for sorting by turnaround — the upper bound of the quoted range. */
export function processingDays(slug: string): number {
  const match = directoryMeta(slug).processingTime.match(/(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!match) return 99;
  return Number(match[2] ?? match[1]);
}
