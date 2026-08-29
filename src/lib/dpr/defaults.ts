import {
  DPR_APPLY_PATH,
  DPR_LAUNCH_PRICE,
  DPR_SECTION_KEYS,
} from "@/lib/dpr/constants";
import type {
  DprCmsPayload,
  DprComparisonRow,
  DprFaq,
  DprPageSettings,
  DprPricingPlan,
  DprRelatedService,
  DprReview,
  DprSection,
} from "@/lib/dpr/types";

export const DEFAULT_DPR_SETTINGS: DprPageSettings = {
  stickyCtaEnabled: true,
  stickyCtaLabel: `Apply for DPR — ₹${DPR_LAUNCH_PRICE}`,
  stickyCtaUrl: DPR_APPLY_PATH,
  videoUrl: null,
  whatsappNumber: "917007595931",
  supportPhone: "+917007595931",
  defaultPlanId: "basic",
  metaTitle: "Detailed Project Report (DPR) Online | DigiConnect Dukan",
  metaDescription:
    "Get a bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva & MSME schemes. Launch offer ₹399 with DigiConnect Dukan.",
};

const SECTION_COPY: Record<
  string,
  { heading: string; description: string; ctaLabel?: string; ctaUrl?: string }
> = {
  hero: {
    heading: "Detailed Project Report",
    description:
      "Bank-ready DPR for PMEGP, Mudra, CM Yuva & MSME loan schemes — launch offer ₹399.",
    ctaLabel: "Apply Now",
    ctaUrl: DPR_APPLY_PATH,
  },
  trust: {
    heading: "Trusted by entrepreneurs across India",
    description: "Verified process, expert drafting, and partner-backed delivery.",
  },
  what_is: {
    heading: "What is a Detailed Project Report?",
    description:
      "A DPR is the formal project document banks and departments need before approving subsidy-linked loans.",
  },
  video: {
    heading: "See how DigiConnect prepares your DPR",
    description: "Watch a short overview of our guided process.",
  },
  why_us: {
    heading: "Why DigiConnect for your DPR",
    description: "Scheme-aware drafting with document checks and fast turnaround.",
  },
  schemes: {
    heading: "Schemes we support",
    description: "PMEGP, Mudra, CM Yuva, PM Vishwakarma, and more.",
  },
  includes: {
    heading: "What your DPR includes",
    description: "Costing, machinery, projections, and scheme-aligned annexures.",
  },
  pricing: {
    heading: "Transparent pricing",
    description: "Start at ₹399 for a bank-ready Basic DPR.",
    ctaLabel: "Choose a plan",
    ctaUrl: "#pricing",
  },
  comparison: {
    heading: "DigiConnect vs others",
    description: "Clear deliverables, support, and revision policy.",
  },
  process: {
    heading: "Simple 6-step process",
    description: "From details to payment to delivery tracking.",
  },
  samples: {
    heading: "Sample DPR previews",
    description: "See the structure banks expect.",
  },
  reviews: {
    heading: "Customer reviews",
    description: "Real entrepreneurs who got loan-ready reports.",
  },
  success: {
    heading: "What the report looks like",
    description: "The chapters change with the kind of business you are building.",
  },
  articles: {
    heading: "Guides & articles",
    description:
      "Longer reads on schemes, costings and what a bank looks for in a project file.",
  },
  faq: {
    heading: "Frequently asked questions",
    description: "Answers about documents, timelines, and schemes.",
  },
  trust_badges: {
    heading: "Secure & verified",
    description: "Payments, data, and document handling you can trust.",
  },
  documents: {
    heading: "Documents checklist",
    description: "Keep these ready before you apply.",
  },
  benefits: {
    heading: "Benefits of a professional DPR",
    description: "Higher clarity for banks and faster file movement.",
  },
  stats: {
    heading: "The service, in four numbers",
    description: "What it costs, what it covers, how long it takes, and what you receive.",
  },
  cta: {
    heading: "Ready to get your DPR?",
    description: "Apply online in minutes. Launch offer ₹399.",
    ctaLabel: "Apply Now",
    ctaUrl: DPR_APPLY_PATH,
  },
  related: {
    heading: "Related services",
    description: "Pair your DPR with MSME, GST, and loan guidance.",
  },
  contact: {
    heading: "Talk to an expert",
    description: "WhatsApp or call for scheme-specific guidance.",
    ctaLabel: "WhatsApp",
  },
  sticky_cta: {
    heading: "Sticky mobile CTA",
    description: "Always-visible apply bar on mobile.",
    ctaLabel: `Apply for DPR — ₹${DPR_LAUNCH_PRICE}`,
    ctaUrl: DPR_APPLY_PATH,
  },
};

export const DEFAULT_DPR_SECTIONS: DprSection[] = DPR_SECTION_KEYS.map((key, index) => {
  const copy = SECTION_COPY[key];
  return {
    sectionKey: key,
    enabled: true,
    sortOrder: (index + 1) * 10,
    heading: copy.heading,
    description: copy.description,
    ctaLabel: copy.ctaLabel ?? null,
    ctaUrl: copy.ctaUrl ?? null,
    animationType: "fade-up",
  };
});

export const DEFAULT_DPR_PRICING: DprPricingPlan[] = [
  {
    planKey: "basic",
    name: "Basic",
    price: 399,
    oldPrice: 999,
    description: "Bank-ready DPR for a single scheme with standard projections.",
    features: [
      "Scheme-aligned DPR PDF",
      "Cost & means of finance",
      "3-year projections",
      "1 revision",
      "WhatsApp support",
    ],
    isFeatured: true,
    isActive: true,
    sortOrder: 10,
    ctaLabel: "Start Basic",
  },
  {
    planKey: "professional",
    name: "Professional",
    price: 799,
    oldPrice: 1499,
    description: "Enhanced DPR with machinery schedule and deeper financials.",
    features: [
      "Everything in Basic",
      "Machinery schedule",
      "Working capital note",
      "2 revisions",
      "Priority drafting",
    ],
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    ctaLabel: "Choose Professional",
  },
  {
    planKey: "premium",
    name: "Premium",
    price: 1499,
    oldPrice: 2499,
    description: "Full package with comparison notes and banker checklist.",
    features: [
      "Everything in Professional",
      "Subsidy calculation note",
      "Banker checklist",
      "3 revisions",
      "Call support",
    ],
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    ctaLabel: "Choose Premium",
  },
  {
    planKey: "enterprise",
    name: "Enterprise",
    price: 2999,
    oldPrice: 4999,
    description: "Multi-unit / complex project with custom annexures.",
    features: [
      "Everything in Premium",
      "Multi-unit support",
      "Custom annexures",
      "Dedicated specialist",
      "Express option",
    ],
    isFeatured: false,
    isActive: true,
    sortOrder: 40,
    ctaLabel: "Talk to sales",
  },
];

export const DEFAULT_DPR_FAQS: DprFaq[] = [
  {
    question: "What is included in the ₹399 Basic DPR?",
    answer:
      "A scheme-aligned Detailed Project Report PDF with cost of project, means of finance, and standard 3-year projections, plus one revision.",
    isActive: true,
    sortOrder: 10,
  },
  {
    question: "Which schemes do you support?",
    answer:
      "PMEGP, Mudra, CM Yuva, PM Vishwakarma, and common state MSME subsidy schemes. Mention your scheme while applying.",
    isActive: true,
    sortOrder: 20,
  },
  {
    question: "How long does delivery take?",
    answer:
      "Most Basic DPRs are drafted within 24–72 working hours after documents and project details are complete.",
    isActive: true,
    sortOrder: 30,
  },
  {
    question: "Can I use this DPR for bank submission?",
    answer:
      "Yes. Reports are prepared in a bank-friendly format. Final acceptance always depends on the lending bank/department.",
    isActive: true,
    sortOrder: 40,
  },
  {
    question: "What documents do I need?",
    answer:
      "PAN, Aadhaar, quotation/estimate, GST (if any), Udyam, photo, recent bank statement, and other scheme-specific proofs.",
    isActive: true,
    sortOrder: 50,
  },
  {
    question: "Do you help with loan filing too?",
    answer:
      "DPR is the project report. You can also apply for related DigiConnect loan/MSME services from the same portal.",
    isActive: true,
    sortOrder: 60,
  },
];

/**
 * No reviews ship with the code.
 *
 * This list used to hold three invented testimonials — a name, a city and a
 * quote for each — which the page also fed into `Review` and `AggregateRating`
 * structured data. Publishing fabricated reviews as machine-readable ratings
 * is a misrepresentation to every customer who reads them and to the search
 * engines that index them, and it is the same thing that was removed from the
 * homepage and the services directory.
 *
 * Real reviews are entered by an administrator at /admin/services/dpr. Until
 * there are some, the reviews band does not render and no rating is claimed.
 */
export const DEFAULT_DPR_REVIEWS: DprReview[] = [];

export const DEFAULT_DPR_COMPARISON: DprComparisonRow[] = [
  { feature: "Scheme-aware DPR drafting", digiconnect: "Yes", others: "Generic templates", isActive: true, sortOrder: 10 },
  { feature: "Transparent launch pricing", digiconnect: "From ₹399", others: "Often unclear", isActive: true, sortOrder: 20 },
  { feature: "Online tracking & documents", digiconnect: "Customer portal", others: "Email / WhatsApp only", isActive: true, sortOrder: 30 },
  { feature: "Partner-assisted filing option", digiconnect: "Available", others: "Rare", isActive: true, sortOrder: 40 },
  { feature: "Revision support", digiconnect: "Included by plan", others: "Extra charges", isActive: true, sortOrder: 50 },
];

export const DEFAULT_DPR_RELATED: DprRelatedService[] = [
  {
    serviceSlug: "msme-registration",
    title: "MSME / Udyam Registration",
    description: "Register your enterprise before loan filing.",
    isActive: true,
    sortOrder: 10,
  },
  {
    serviceSlug: "gst-registration",
    title: "GST Registration",
    description: "Get GSTIN for business compliance and tenders.",
    isActive: true,
    sortOrder: 20,
  },
  {
    serviceSlug: "pmegp-loan",
    title: "PMEGP Loan Guidance",
    description: "Guided PMEGP application support.",
    isActive: true,
    sortOrder: 30,
  },
  {
    serviceSlug: "mudra-loan",
    title: "Mudra Loan Guidance",
    description: "Mudra documentation and process assistance.",
    isActive: true,
    sortOrder: 40,
  },
];

export const DPR_SCHEMES = [
  { name: "PMEGP", blurb: "Prime Minister’s Employment Generation Programme" },
  { name: "Mudra", blurb: "Shishu / Kishor / Tarun working capital & term loans" },
  { name: "CM Yuva", blurb: "State youth entrepreneur loan assistance" },
  { name: "PM Vishwakarma", blurb: "Artisan & craftsperson scheme support" },
  { name: "State MSME", blurb: "State subsidy and industrial schemes" },
  { name: "Other", blurb: "Custom bank / NBFC project proposals" },
];

export const DPR_INCLUDES = [
  { title: "Project profile", detail: "Promoter, unit, location, and activity summary" },
  { title: "Cost of project", detail: "Land, building, machinery, WC & contingencies" },
  { title: "Means of finance", detail: "Own funds, loan, and subsidy split" },
  { title: "Machinery schedule", detail: "Item-wise quantities and estimates" },
  { title: "Financial projections", detail: "Sales, profit, and repayment capacity" },
  { title: "Annexures", detail: "Checklist-ready supporting notes" },
];

export const DPR_PROCESS_STEPS = [
  { step: 1, title: "Personal details", detail: "Identity and contact basics" },
  { step: 2, title: "Business details", detail: "Unit name, type, and address" },
  { step: 3, title: "Project details", detail: "Scheme, costs, loan & projections" },
  { step: 4, title: "Machinery table", detail: "Dynamic equipment schedule" },
  { step: 5, title: "Uploads", detail: "PAN, Aadhaar, quotes & proofs" },
  { step: 6, title: "Review & pay", detail: "Confirm, pay securely, track" },
];

export const DPR_DOCUMENTS = [
  "PAN Card",
  "Aadhaar Card",
  "Machinery / Quotation estimate",
  "GST Certificate (if registered)",
  "Udyam / MSME Certificate",
  "Passport size photograph",
  "Recent bank statement",
  "Other scheme-specific documents",
];

export const DPR_BENEFITS = [
  "Clearer loan appraisal for bankers",
  "Scheme-aligned cost & subsidy notes",
  "Faster file movement with complete docs",
  "Portal tracking and revision workflow",
  "Partner-assisted option for local help",
];

/**
 * Four facts about the service.
 *
 * Each is something the business sets and can be held to — the price it
 * charges, the schemes it drafts against, the window it works to, the number
 * of chapters in the report. The fourth used to be a "4.9 customer rating"
 * that nothing produced and nobody could check; a number like that on a page
 * selling a loan document costs more trust than it buys.
 */
export const DPR_STATS = [
  { label: "Launch price", value: DPR_LAUNCH_PRICE, prefix: "₹", suffix: "" },
  { label: "Schemes drafted for", value: 6, prefix: "", suffix: "+" },
  { label: "Typical turnaround", value: 48, prefix: "", suffix: "h" },
  { label: "Chapters in the report", value: 6, prefix: "", suffix: "" },
];

export const DPR_WHY_US = [
  { title: "Scheme-aware drafting", detail: "Templates tuned for PMEGP, Mudra, CM Yuva & more." },
  { title: "Document-first workflow", detail: "Checklist and uploads reduce bank rework." },
  { title: "Transparent pricing", detail: "Start at ₹399 with clear package upgrades." },
  { title: "Portal tracking", detail: "Follow status, invoices, and delivery in one place." },
];

export const DPR_TRUST_BADGES = [
  "Secure Razorpay payments",
  "Document signature checks",
  "Customer portal tracking",
  "PAN India partner network",
  "RNOS-backed operations",
];

/**
 * What the report looks like for three shapes of business.
 *
 * These describe the deliverable — which chapters a manufacturing file carries
 * that a service file does not — rather than claiming outcomes on behalf of
 * customers who were never named. An approval is the bank's decision, and this
 * page does not promise one.
 */
export const DPR_SUCCESS_STORIES = [
  {
    title: "Manufacturing unit",
    detail:
      "Item-wise machinery schedule, power and space requirements, and a capacity-linked sales projection — the three tables a term-loan appraisal turns on.",
  },
  {
    title: "Shop or service unit",
    detail:
      "Working-capital cycle, fit-out and stock costing, and a monthly break-even view, sized for a Mudra file rather than a factory one.",
  },
  {
    title: "Artisan or micro enterprise",
    detail:
      "A short-form report with the subsidy note and cost break-up that PM Vishwakarma and state MSME schemes ask for, without the annexures they do not.",
  },
];

export const DPR_SAMPLE_PREVIEWS = [
  { title: "Cover & promoter profile", detail: "Identity, activity, and location snapshot" },
  { title: "Cost & means of finance", detail: "Bank-standard financial structure" },
  { title: "Projections sheet", detail: "Sales, profit, and repayment view" },
];

export function getDefaultDprCmsPayload(): DprCmsPayload {
  return {
    settings: DEFAULT_DPR_SETTINGS,
    sections: DEFAULT_DPR_SECTIONS,
    banners: [],
    pricing: DEFAULT_DPR_PRICING,
    faqs: DEFAULT_DPR_FAQS,
    reviews: DEFAULT_DPR_REVIEWS,
    comparison: DEFAULT_DPR_COMPARISON,
    related: DEFAULT_DPR_RELATED,
  };
}
