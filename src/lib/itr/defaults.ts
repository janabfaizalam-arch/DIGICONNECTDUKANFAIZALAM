import {
  ITR_APPLY_PATH,
  ITR_SECTION_KEYS,
  ITR_STARTING_PRICE,
} from "@/lib/itr/constants";
import type {
  ItrCmsPayload,
  ItrComparisonRow,
  ItrDocumentItem,
  ItrFaq,
  ItrPageSettings,
  ItrPricingPlan,
  ItrRelatedService,
  ItrSection,
} from "@/lib/itr/types";

export const DEFAULT_ITR_SETTINGS: ItrPageSettings = {
  serviceName: "Income Tax Return Filing",
  shortName: "ITR Filing",
  assessmentYear: "AY 2026-27 (FY 2025-26)",
  filingOpenNotice: "ITR Filing Now Open",
  startingPrice: ITR_STARTING_PRICE,
  heroHeading: "File Your Income Tax Return with Expert Support",
  heroDescription:
    "Professional ITR filing for salaried individuals, businesses, professionals, freelancers, investors and property owners.",
  primaryCtaLabel: "Apply Now",
  primaryCtaUrl: ITR_APPLY_PATH,
  secondaryCtaLabel: "Talk to Expert",
  secondaryCtaUrl: null,
  supportCtaLabel: "Check Required Documents",
  supportCtaUrl: "#documents",
  estimatedTurnaround: "2-3 Working Days",
  stickyCtaEnabled: true,
  stickyCtaLabel: `Apply for ITR — from ₹${ITR_STARTING_PRICE}`,
  stickyCtaUrl: ITR_APPLY_PATH,
  videoUrl: null,
  whatsappNumber: "917007595931",
  supportPhone: "+917007595931",
  defaultPlanId: "basic",
  isPublished: true,
  metaTitle: "Income Tax Return Filing Online | DigiConnect Dukan",
  metaDescription:
    "Expert-assisted ITR filing for salaried, business, capital gains and freelancers. Transparent packages starting from ₹499 with DigiConnect Dukan.",
  metaKeywords: "ITR filing online, Income Tax Return filing, ITR filing service, freelancer ITR, capital gains ITR",
  ogTitle: null,
  ogDescription: null,
  ogImageUrl: null,
  twitterImageUrl: null,
  robotsIndex: true,
  pricingDisclaimer:
    "Starting prices shown. Final fees may depend on return complexity after document review.",
  finalQuoteDisclaimer:
    "Final ITR form and payable amount are confirmed after expert document review.",
  taxLiabilityDisclaimer:
    "Tax payable and refund depend on official records and applicable law. DigiConnect does not guarantee refunds.",
  refundDisclaimer:
    "Refund processing time and amount are controlled by the Income Tax Department.",
  customerDeclaration:
    "I confirm that the information and documents provided are true and complete to the best of my knowledge.",
};

const SECTION_COPY: Record<string, { heading: string; description: string; ctaLabel?: string; ctaUrl?: string }> = {
  hero: {
    heading: DEFAULT_ITR_SETTINGS.heroHeading!,
    description: DEFAULT_ITR_SETTINGS.heroDescription!,
    ctaLabel: "Apply Now",
    ctaUrl: ITR_APPLY_PATH,
  },
  trust: {
    heading: "Built for trust and clarity",
    description: "Secure documents, transparent pricing, expert-assisted filing, and online tracking.",
  },
  what_is: {
    heading: "What is an Income Tax Return?",
    description: "ITR is your official statement of income, deductions, and tax for a financial year.",
  },
  who_should_file: {
    heading: "Who may need to file ITR?",
    description: "Educational guide — final applicability depends on income, thresholds and current law.",
  },
  income_sources: {
    heading: "Income sources we support",
    description: "Salary, business, capital gains, property, interest, and more — mapped after document review.",
  },
  form_comparison: {
    heading: "ITR form comparison",
    description: "Typical forms explained. Final form is selected after document review.",
  },
  benefits: {
    heading: "Benefits of filing ITR",
    description: "Income record, refund claims, and documentation support — without guaranteed outcomes.",
  },
  documents: {
    heading: "Documents checklist",
    description: "Category-wise list. Requirements adapt to your filing profile.",
  },
  process: {
    heading: "How filing works",
    description: "From profile selection to acknowledgement delivery.",
  },
  pricing: {
    heading: "Transparent packages",
    description: "Starting prices. Final amount may change after complexity review.",
    ctaLabel: "Choose a plan",
    ctaUrl: "#pricing",
  },
  self_vs_expert: {
    heading: "Self filing vs expert-assisted",
    description: "Fair comparison of effort, checks, and support.",
  },
  why_us: {
    heading: "Why DigiConnect Dukan",
    description: "Guided apply, secure uploads, tracking, invoice, and CRM workflow.",
  },
  mistakes: {
    heading: "Common filing mistakes",
    description: "Educational tips to reduce avoidable errors.",
  },
  reviews: {
    heading: "Customer reviews",
    description: "CMS-managed reviews only when verified and active.",
  },
  trust_us: {
    heading: "Why trust us",
    description: "Brand, secure payments, privacy-focused handling — no government endorsement claimed.",
  },
  faq: {
    heading: "Frequently asked questions",
    description: "Admin-managed answers about ITR filing.",
  },
  related: {
    heading: "Related services",
    description: "GST, MSME, DPR and other DigiConnect services.",
  },
  cta: {
    heading: "Ready to file your ITR?",
    description: "Apply online with expert-assisted support.",
    ctaLabel: "Apply for ITR Filing",
    ctaUrl: ITR_APPLY_PATH,
  },
  sticky_cta: {
    heading: "Sticky mobile CTA",
    description: "Compact apply bar on mobile.",
    ctaLabel: `Apply for ITR — from ₹${ITR_STARTING_PRICE}`,
    ctaUrl: ITR_APPLY_PATH,
  },
};

export const DEFAULT_ITR_SECTIONS: ItrSection[] = ITR_SECTION_KEYS.map((key, index) => {
  const copy = SECTION_COPY[key];
  return {
    sectionKey: key,
    enabled: true,
    sortOrder: (index + 1) * 10,
    heading: copy.heading,
    subheading: null,
    description: copy.description,
    content: {},
    layoutStyle: "default",
    ctaLabel: copy.ctaLabel ?? null,
    ctaUrl: copy.ctaUrl ?? null,
    animationType: "fade-up",
  };
});

export const DEFAULT_ITR_PRICING: ItrPricingPlan[] = [
  {
    planKey: "basic",
    name: "Basic ITR",
    price: 499,
    oldPrice: 799,
    description: "Starting from ₹499 for simple salary / interest returns.",
    features: ["Single Form 16 support", "Basic bank interest", "Expert-assisted filing", "Digital invoice", "Portal tracking"],
    eligibleProfiles: ["salaried", "pensioner"],
    complexityNotes: null,
    isFeatured: true,
    isActive: true,
    sortOrder: 10,
    ctaLabel: "Start Basic",
  },
  {
    planKey: "professional",
    name: "Professional ITR",
    price: 999,
    oldPrice: 1499,
    description: "Starting from ₹999 for multi-source individual returns.",
    features: ["Multiple Form 16", "House property", "Interest & dividend", "Deduction review", "Priority support"],
    eligibleProfiles: ["salaried", "investor", "property_owner", "mixed"],
    complexityNotes: null,
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    ctaLabel: "Choose Professional",
  },
  {
    planKey: "business",
    name: "Business ITR",
    price: 1499,
    oldPrice: 2499,
    description: "Starting from ₹1,499 for proprietor / freelancer / presumptive cases.",
    features: ["Business / profession", "Presumptive taxation support", "Basic statements guidance", "GST cross-check notes", "Expert review"],
    eligibleProfiles: ["business", "professional", "freelancer"],
    complexityNotes: null,
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    ctaLabel: "Choose Business",
  },
  {
    planKey: "capital_gains",
    name: "Capital Gains ITR",
    price: 1999,
    oldPrice: 2999,
    description: "Starting from ₹1,999 for shares, mutual funds or property gains.",
    features: ["Capital gain schedules", "Broker statement review", "Property transaction notes", "Complexity screening", "Expert support"],
    eligibleProfiles: ["investor", "property_owner", "mixed"],
    complexityNotes: null,
    isFeatured: false,
    isActive: true,
    sortOrder: 40,
    ctaLabel: "Choose Capital Gains",
  },
  {
    planKey: "complex",
    name: "Complex ITR",
    price: 0,
    oldPrice: null,
    description: "Custom quote for F&O, crypto/VDA, foreign income/assets or specialist cases.",
    features: ["Manual complexity review", "Specialist assignment", "Custom deliverables", "Quote after screening"],
    eligibleProfiles: ["mixed", "investor", "business"],
    complexityNotes: "Requires manual quote",
    isFeatured: false,
    isActive: true,
    sortOrder: 50,
    ctaLabel: "Request quote",
  },
];

export const DEFAULT_ITR_FAQS: ItrFaq[] = [
  {
    question: "What is ITR?",
    answer:
      "An Income Tax Return (ITR) is the statement you file with the Income Tax Department summarising income, deductions, and tax for a financial year.",
    isActive: true,
    sortOrder: 10,
  },
  {
    question: "Who should file ITR?",
    answer:
      "Filing requirements depend on income, thresholds, residency, and other factors under current law. Our experts guide you after reviewing documents.",
    isActive: true,
    sortOrder: 20,
  },
  {
    question: "Which ITR form is applicable?",
    answer:
      "Form selection depends on income sources and taxpayer category. Final form is confirmed after document review — not solely from the online questionnaire.",
    isActive: true,
    sortOrder: 30,
  },
  {
    question: "Is a refund guaranteed?",
    answer:
      "No. Refund eligibility and timing are determined by the Income Tax Department based on your records and applicable law.",
    isActive: true,
    sortOrder: 40,
  },
  {
    question: "How will I receive filed documents?",
    answer:
      "After filing, permitted deliverables (computation, acknowledgement, ITR-V where applicable) appear in your DigiConnect customer portal.",
    isActive: true,
    sortOrder: 50,
  },
  {
    question: "Is my information secure?",
    answer:
      "Documents use private storage with role-based access. Marketing banners are stored separately from tax documents.",
    isActive: true,
    sortOrder: 60,
  },
];

export const DEFAULT_ITR_COMPARISON: ItrComparisonRow[] = [
  {
    feature: "ITR-1 Sahaj",
    formCode: "ITR-1",
    typicalTaxpayer: "Salaried / pensioner (typical)",
    commonSources: "Salary, pension, interest",
    commonExclusions: "Business, capital gains (typical exclusions)",
    complexity: "Low",
    suggestedPackage: "Basic",
    digiconnect: "Guided + review",
    selfFiling: "Self-map forms",
    isActive: true,
    sortOrder: 10,
  },
  {
    feature: "ITR-2",
    formCode: "ITR-2",
    typicalTaxpayer: "Individuals with capital gains / multiple HP",
    commonSources: "Salary + CG / HP",
    commonExclusions: "Business income (typical)",
    complexity: "Medium",
    suggestedPackage: "Professional / Capital Gains",
    digiconnect: "Schedule support",
    selfFiling: "Manual schedules",
    isActive: true,
    sortOrder: 20,
  },
  {
    feature: "ITR-3",
    formCode: "ITR-3",
    typicalTaxpayer: "Business / profession",
    commonSources: "Business, profession",
    commonExclusions: "Varies",
    complexity: "Higher",
    suggestedPackage: "Business / Complex",
    digiconnect: "Expert-assisted",
    selfFiling: "Books & audit awareness",
    isActive: true,
    sortOrder: 30,
  },
  {
    feature: "ITR-4 Sugam",
    formCode: "ITR-4",
    typicalTaxpayer: "Presumptive taxation (typical)",
    commonSources: "Presumptive business/profession",
    commonExclusions: "Varies",
    complexity: "Medium",
    suggestedPackage: "Business",
    digiconnect: "Presumptive guidance",
    selfFiling: "Self computation",
    isActive: true,
    sortOrder: 40,
  },
];

export const DEFAULT_ITR_RELATED: ItrRelatedService[] = [
  { serviceSlug: "gst-registration", title: "GST Registration", description: "Register for GSTIN with guided support.", isActive: true, sortOrder: 10 },
  { serviceSlug: "gst-return-filing", title: "GST Return Filing", description: "Assisted GSTR filing support.", isActive: true, sortOrder: 20 },
  { serviceSlug: "msme-registration", title: "MSME / Udyam", description: "Udyam registration for enterprises.", isActive: true, sortOrder: 30 },
  { serviceSlug: "detailed-project-report", title: "Detailed Project Report", description: "Bank-ready DPR for loan schemes.", isActive: true, sortOrder: 40 },
  { serviceSlug: "dsc", title: "Digital Signature Certificate", description: "Class-3 DSC for e-filings.", isActive: true, sortOrder: 50 },
];

export const DEFAULT_ITR_DOCUMENTS: ItrDocumentItem[] = [
  { categoryKey: "common", categoryLabel: "Common Documents", documentKey: "pan", documentLabel: "PAN Card", taxpayerProfiles: [], incomeSources: [], requiredDefault: true, helpText: null, isActive: true, sortOrder: 10 },
  { categoryKey: "common", categoryLabel: "Common Documents", documentKey: "aadhaar", documentLabel: "Aadhaar Card", taxpayerProfiles: [], incomeSources: [], requiredDefault: true, helpText: null, isActive: true, sortOrder: 20 },
  { categoryKey: "common", categoryLabel: "Common Documents", documentKey: "bank_proof", documentLabel: "Cancelled cheque / passbook", taxpayerProfiles: [], incomeSources: [], requiredDefault: true, helpText: null, isActive: true, sortOrder: 30 },
  { categoryKey: "salary", categoryLabel: "Salary", documentKey: "form16", documentLabel: "Form 16", taxpayerProfiles: ["salaried"], incomeSources: ["salary"], requiredDefault: true, helpText: null, isActive: true, sortOrder: 40 },
  { categoryKey: "tax_records", categoryLabel: "Tax Records", documentKey: "ais", documentLabel: "AIS", taxpayerProfiles: [], incomeSources: [], requiredDefault: false, helpText: null, isActive: true, sortOrder: 50 },
  { categoryKey: "tax_records", categoryLabel: "Tax Records", documentKey: "form26as", documentLabel: "Form 26AS", taxpayerProfiles: [], incomeSources: [], requiredDefault: false, helpText: null, isActive: true, sortOrder: 60 },
  { categoryKey: "capital", categoryLabel: "Capital Gains", documentKey: "broker_statement", documentLabel: "Broker statement", taxpayerProfiles: ["investor"], incomeSources: ["shares", "mutual_funds"], requiredDefault: false, helpText: null, isActive: true, sortOrder: 70 },
  { categoryKey: "business", categoryLabel: "Business / Profession", documentKey: "pl_summary", documentLabel: "Profit & loss / sales summary", taxpayerProfiles: ["business", "professional", "freelancer"], incomeSources: ["business", "profession", "freelancing"], requiredDefault: false, helpText: null, isActive: true, sortOrder: 80 },
];

export const ITR_WHO_SHOULD_FILE = [
  "Salaried employee",
  "Business owner / proprietor",
  "Freelancer / professional / consultant",
  "Property owner",
  "Investor / trader",
  "Pensioner",
  "Person with bank interest or dividends",
  "Person with capital gains",
  "Person with foreign income or assets",
  "Person seeking loan or visa documentation",
  "Person requiring income proof",
];

export const ITR_INCOME_SOURCES = [
  { id: "salary", label: "Salary" },
  { id: "pension", label: "Pension" },
  { id: "business", label: "Business income" },
  { id: "profession", label: "Professional income" },
  { id: "freelancing", label: "Freelancing" },
  { id: "house_property", label: "House property" },
  { id: "rental", label: "Rental income" },
  { id: "savings_interest", label: "Savings interest" },
  { id: "fd_interest", label: "FD interest" },
  { id: "dividend", label: "Dividend" },
  { id: "shares", label: "Shares" },
  { id: "mutual_funds", label: "Mutual funds" },
  { id: "property_cg", label: "Property sale" },
  { id: "fno", label: "Futures and options" },
  { id: "intraday", label: "Intraday trading" },
  { id: "crypto", label: "Cryptocurrency / VDA" },
  { id: "agriculture", label: "Agricultural income" },
  { id: "foreign_income", label: "Foreign income" },
  { id: "foreign_assets", label: "Foreign assets" },
  { id: "other", label: "Other income" },
];

export const ITR_PROCESS_STEPS = [
  { step: 1, title: "Select filing profile", detail: "Assessment year, applicant type, and filing reason" },
  { step: 2, title: "Personal & bank details", detail: "PAN, contact, address, refund account" },
  { step: 3, title: "Income sources", detail: "Multi-select with conditional details" },
  { step: 4, title: "Tax & deductions", detail: "TDS, advance tax, 80C/80D and more" },
  { step: 5, title: "Upload documents", detail: "Dynamic checklist by profile" },
  { step: 6, title: "Review & pay", detail: "Package, disclaimers, secure payment" },
];

export const ITR_BENEFITS = [
  "Official income record for the year",
  "Support for loan / visa documentation requests",
  "Pathway to claim eligible refunds",
  "Carry-forward of eligible losses (where applicable)",
  "Business and high-value transaction documentation",
];

export const ITR_MISTAKES = [
  "Missing bank interest reported in AIS",
  "Choosing the wrong return form",
  "Ignoring capital gains schedules",
  "Incorrect tax regime selection",
  "Unverified refund bank account",
  "Mismatch between TDS and Form 26AS",
];

export const ITR_TRUST_POINTS = [
  "Secure document handling",
  "Transparent starting prices",
  "Expert-assisted filing",
  "Online status tracking",
  "Digital invoice",
  "Secure Razorpay payments",
  "Powered by RNOS India Pvt. Ltd.",
];

export const ITR_WHY_US = [
  { title: "Guided application", detail: "Profile-aware wizard with autosave." },
  { title: "Expert-assisted process", detail: "Document review before filing." },
  { title: "Secure uploads", detail: "Private storage with signed access." },
  { title: "CRM tracking", detail: "Customer, partner, and admin visibility." },
];

export function getDefaultItrCmsPayload(): ItrCmsPayload {
  return {
    settings: DEFAULT_ITR_SETTINGS,
    sections: DEFAULT_ITR_SECTIONS,
    banners: [],
    pricing: DEFAULT_ITR_PRICING,
    faqs: DEFAULT_ITR_FAQS,
    reviews: [],
    comparison: DEFAULT_ITR_COMPARISON,
    related: DEFAULT_ITR_RELATED,
    documents: DEFAULT_ITR_DOCUMENTS,
  };
}
