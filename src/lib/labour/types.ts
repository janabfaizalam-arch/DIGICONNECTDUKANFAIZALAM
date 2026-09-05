/**
 * The shape of a Labour Card benefit, and why it is shaped this way.
 *
 * Two rules from the brief drove every decision here, because both are ways a
 * page like this misleads somebody who is counting on the money:
 *
 * A benefit is never just a number. ₹25,000 cash and a ₹25,000 fixed deposit
 * are different things — one buys food this month, one matures when a
 * daughter turns eighteen — and a page that adds them into "₹50,000" has told
 * a lie that a family may plan around. So every benefit line carries an
 * explicit `kind`, there is no total field anywhere, and nothing in this
 * codebase can sum two lines of different kinds.
 *
 * And a benefit is never just an amount. The 365-day membership, the 90-day
 * work condition, the two-child limit, the one-year application window — these
 * are the reasons applications are rejected, and burying them in a disclaimer
 * is how a customer finds out too late. Conditions are a first-class field and
 * the card renders them beside the amount, not below the fold.
 */

export type BenefitKind =
  | "cash"
  | "fd"
  | "reimbursement"
  | "installment"
  | "pension"
  | "service"
  | "awareness";

export type BenefitFrequency = "one_time" | "monthly" | "annual" | "per_event" | "as_notified";

/**
 * One payable thing.
 *
 * `amount` is null wherever the official position is "no maximum fixed", a
 * wage-linked figure, or a number nobody has verified — the UI prints
 * `amountNote` instead of inventing a rupee value.
 */
export type BenefitLine = {
  label: string;
  /**
   * The same line in Hindi, for the public page.
   *
   * Optional and additive: it lives inside the existing `benefits` JSON, so
   * no column and no migration. A record without it still renders — the Latin
   * label is the fallback — which matters because an administrator adding a
   * scheme in the panel should not be blocked on translating it.
   */
  labelHi?: string;
  kind: BenefitKind;
  amount: number | null;
  /** Used when there is no single rupee figure, or the figure needs a caveat. */
  amountNote?: string;
  frequency: BenefitFrequency;
  /** Shown right beside the money. Never only in a disclaimer. */
  conditions?: string[];
};

export type SchemeCategory =
  | "child_maternity"
  | "marriage"
  | "education"
  | "cycle"
  | "residential_education"
  | "medical"
  | "disability"
  | "death"
  | "funeral"
  | "pension"
  | "toilet"
  | "skill"
  | "awareness"
  | "disaster"
  | "linked";

/** How sure we are, and who said so. Displayed, never assumed. */
export type Verification = {
  status: "verified" | "needs_review" | "outdated" | "archived";
  /** Who supplied the figures. Not a claim of government endorsement. */
  providedBy: string;
  verifiedOn: string;
  /** The exact notification or page, when somebody has recorded one. */
  sourceUrl: string | null;
  sourceTitle: string;
  sourceDate: string | null;
  /** Anything genuinely unresolved. Rendered as a warning on the card. */
  caveat?: string;
};

export type LabourScheme = {
  id: string;
  slug: string;
  name: string;
  nameHi?: string;
  category: SchemeCategory;
  summary: string;
  /** Who the money reaches — worker, spouse, child, nominee. */
  beneficiaries: string[];
  benefits: BenefitLine[];
  eligibility: string[];
  /** The conditions that most often sink an application. */
  keyConditions: {
    membershipDays?: number;
    workDaysLast12Months?: number;
    childLimit?: number;
    minAge?: number;
    maxAge?: number;
    applicationWindow?: string;
  };
  documents: string[];
  process: string[];
  paymentMethod: string;
  /** Things the page must say out loud rather than imply. */
  warnings?: string[];
  verification: Verification;
  sortOrder: number;
  published: boolean;
};

export const BENEFIT_KIND_LABEL: Record<BenefitKind, string> = {
  cash: "Cash",
  fd: "Fixed Deposit",
  reimbursement: "Reimbursement",
  installment: "Monthly installments",
  pension: "Monthly pension",
  service: "Free service",
  awareness: "Awareness programme",
};

/** The legend the brief asked for, so the customer learns the vocabulary once. */
export const BENEFIT_KIND_ICON: Record<BenefitKind, string> = {
  cash: "Banknote",
  fd: "Landmark",
  reimbursement: "ReceiptText",
  installment: "CalendarClock",
  pension: "CalendarDays",
  service: "GraduationCap",
  awareness: "Megaphone",
};

export const FREQUENCY_LABEL: Record<BenefitFrequency, string> = {
  one_time: "One time",
  monthly: "Every month",
  annual: "Every year",
  per_event: "Har baar (event par)",
  as_notified: "Jaisa notify ho",
};

/** The public page is written in Hindi; the admin panel stays in English. */
export const FREQUENCY_LABEL_HI: Record<BenefitFrequency, string> = {
  one_time: "एकमुश्त",
  monthly: "हर महीने",
  annual: "हर साल",
  per_event: "हर बार (घटना पर)",
  as_notified: "जैसा अधिसूचित हो",
};

export const BENEFIT_KIND_LABEL_HI: Record<BenefitKind, string> = {
  cash: "नकद (DBT)",
  fd: "सावधि जमा (FD)",
  reimbursement: "प्रतिपूर्ति",
  installment: "मासिक किस्त",
  pension: "मासिक पेंशन",
  service: "नि:शुल्क सेवा",
  awareness: "जागरूकता",
};

export const CATEGORY_LABEL: Record<SchemeCategory, string> = {
  child_maternity: "Child & Maternity",
  marriage: "Marriage",
  education: "Education",
  cycle: "Cycle",
  residential_education: "Residential Education",
  medical: "Medical",
  disability: "Disability",
  death: "Death",
  funeral: "Funeral",
  pension: "Pension",
  toilet: "Toilet",
  skill: "Skill Development",
  awareness: "Awareness",
  disaster: "Disaster Relief",
  linked: "Other Linked Schemes",
};

/**
 * Category names in Hindi, for the public page.
 *
 * A separate map rather than a translation of the one above: the admin panel
 * and the seed data are keyed and read in English, and renaming those in place
 * would change what an administrator sees while editing a record.
 */
export const CATEGORY_LABEL_HI: Record<SchemeCategory, string> = {
  child_maternity: "शिशु व मातृत्व",
  marriage: "विवाह",
  education: "शिक्षा",
  cycle: "साइकिल",
  residential_education: "आवासीय शिक्षा",
  medical: "चिकित्सा",
  disability: "दिव्यांगता",
  death: "मृत्यु",
  funeral: "अंत्येष्टि",
  pension: "पेंशन",
  toilet: "शौचालय",
  skill: "कौशल विकास",
  awareness: "जागरूकता",
  disaster: "आपदा राहत",
  linked: "अन्य संबद्ध योजनाएं",
};

/**
 * Cash and a fixed deposit are not addable. Neither is a reimbursement and a
 * pension. This exists so that no future "total benefit" feature can be
 * written without deleting it on purpose.
 */
export function isSummable(a: BenefitKind, b: BenefitKind): boolean {
  return a === b && (a === "cash" || a === "fd");
}
