import {
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  HandCoins,
  IdCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Store,
  Fingerprint,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

export type ServiceCategorySlug = string;
export type ServiceCtaType = "apply" | "enquiry";

export type ServiceFaq = {
  question: string;
  answer: string;
};

export type ServiceReview = {
  name: string;
  location: string;
  text: string;
};

export type ServiceItem = {
  title: string;
  slug: string;
  category: string;
  categorySlug: ServiceCategorySlug;
  shortDescription: string;
  overview: string;
  benefits: string[];
  documents: string[];
  process: string[];
  oldPrice?: string;
  offerPrice?: string;
  priceLabel: string;
  amount: number;
  ctaType: ServiceCtaType;
  icon: LucideIcon;
  badge: string;
  faqs: ServiceFaq[];
  reviews: ServiceReview[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  blogContent: string;
};

export type ServiceCategory = {
  title: string;
  slug: ServiceCategorySlug;
  heading: string;
  description: string;
  icon: LucideIcon;
  featuredSlugs: string[];
};

const companyName = "DigiConnect Dukan";
const parentCompany = "RNOS India Pvt Ltd";

const categoryCopy: Record<ServiceCategorySlug, { category: string; keyword: string; audience: string; docs: string[]; benefits: string[] }> = {
  cards: {
    category: "Cards & PVC Printing",
    keyword: "PVC card printing",
    audience: "citizens wanting durable smart identity cards in wallet size",
    docs: ["Aadhaar/Identity Card Copy", "Front & Back Photo", "Mobile Number"],
    benefits: [
      "Waterproof & Durable PVC Smart Card",
      "Premium credit card style gloss finish",
      "Standard wallet-friendly sizing",
      "Long-lasting high-resolution color print",
      "Doorstep delivery across PAN India",
    ]
  },
  loans: {
    category: "Loans & Government Schemes",
    keyword: "government subsidy loans",
    audience: "entrepreneurs, artisans, and small business owners seeking funding",
    docs: ["Aadhaar Card", "PAN Card", "Business details", "Bank Statement"],
    benefits: [
      "PMEGP and Mudra loan guided file preparation",
      "PM Vishwakarma registration support",
      "Subsidy schemes documentation check",
      "Secure application with official assistance",
    ]
  },
  banking: {
    category: "Banking & Credit",
    keyword: "finance service",
    audience: "credit card applicants and bank account seekers",
    docs: ["Aadhaar Card", "PAN Card", "Address proof", "Income details/KYC"],
    benefits: [
      "Credit card eligibility evaluation",
      "Savings & Current account opening guidance",
      "Expert CIBIL score health consultation",
      "Fast processing with zero friction",
    ]
  },
  licence: {
    category: "Passport & Licence",
    keyword: "government documentation services",
    audience: "travelers and vehicle drivers needing permit documents",
    docs: ["Aadhaar Card", "Address Proof", "Age/Education Proof", "Passport Size Photo"],
    benefits: [
      "Passport online form & appointment slot support",
      "Learning Driving License application prep",
      "Verified documentation checking",
      "Dedicated WhatsApp assistance",
    ]
  },
  tax: {
    category: "Tax & GST",
    keyword: "tax registration",
    audience: "taxpayers, business owners, and partners needing compliance filing",
    docs: ["Aadhaar Card", "PAN Card", "Business address proof", "Bank details"],
    benefits: [
      "GST registration and filing assistance",
      "ITR income tax return expert guidance",
      "Hassle-free online form submission",
      "Error-free computations and reviews",
    ]
  },
  company: {
    category: "Company Registration & Compliance",
    keyword: "business registration",
    audience: "startups, partners, corporate entities, and small firms",
    docs: ["Aadhaar Card", "PAN Card", "Utility bill of business space", "Specimen signature"],
    benefits: [
      "Private Limited & OPC incorporation help",
      "MSME/Udyam certificate registration",
      "Digital Signature Certificate (DSC) processing",
      "ISO certification file support",
    ]
  },
  insurance: {
    category: "Insurance",
    keyword: "insurance service",
    audience: "vehicle owners, drivers, transport businesses, and fleet operators",
    docs: ["Previous Policy Copy", "Registration Certificate (RC)", "Aadhaar Card", "PAN Card"],
    benefits: [
      "Bike, Car, and Commercial vehicle insurance quotes",
      "Quick renewal of running or expired policies",
      "Third party and comprehensive options",
      "Doorstep digital policy receipt",
    ]
  }
};

export const serviceCategories: ServiceCategory[] = [
  {
    title: "Cards & PVC Printing",
    slug: "cards",
    heading: "Cards & PVC Printing",
    description: "Premium waterproof PVC cards for Aadhaar, Voter ID, eShram, and Labour cards.",
    icon: CreditCard,
    featuredSlugs: ["pvc-card", "voter-id"],
  },
  {
    title: "Loans & Government Schemes",
    slug: "loans",
    heading: "Loans & Government Schemes",
    description: "Apply online for PMEGP, Mudra loans, PM Vishwakarma, and Startup India programs.",
    icon: HandCoins,
    featuredSlugs: ["pmegp-loan", "mudra-loan"],
  },
  {
    title: "Banking & Credit",
    slug: "banking",
    heading: "Banking & Credit Services",
    description: "Credit card applications, Savings & Current accounts, and CIBIL report consultation.",
    icon: Landmark,
    featuredSlugs: ["credit-cards", "cibil-report-increase"],
  },
  {
    title: "Passport & Licence",
    slug: "licence",
    heading: "Passport & Licence Services",
    description: "Guided assistance for online Passport applications and Learning Driving Licence filings.",
    icon: CarFront,
    featuredSlugs: ["passport", "learning-driving-license"],
  },
  {
    title: "Tax & GST",
    slug: "tax",
    heading: "Tax & GST Registration",
    description: "GST Registration, GST filing support, and ITR return filing with certified assistance.",
    icon: ReceiptText,
    featuredSlugs: ["gst-registration-filing", "itr-filing"],
  },
  {
    title: "Company Registration & Compliance",
    slug: "company",
    heading: "Company Registration & Compliance",
    description: "Private Limited, OPC, MSME, DSC, ISO certification and compliance filing services.",
    icon: Building2,
    featuredSlugs: ["private-limited-registration", "msme-registration"],
  },
  {
    title: "Insurance",
    slug: "insurance",
    heading: "All Insurance Services",
    description: "Secure two-wheeler, car, and commercial vehicle insurance quotes and quick renewal support.",
    icon: ShieldCheck,
    featuredSlugs: ["insurance"],
  },
];

const fixedReviews: ServiceReview[] = [
  { name: "Amit Kumar", location: "Lucknow", text: "Fast service and proper guidance." },
  { name: "Shabana Parveen", location: "Barabanki", text: "Documents process bahut easy ho gaya." },
  { name: "Rohit Verma", location: "Kanpur", text: "Good support on WhatsApp." },
];

const fixedProcess = ["Apply Online", "Submit details & documents", "Verification by experts", "Get service completed"];

const iconMap = {
  card: CreditCard,
  voter: IdCard,
  labour: ClipboardCheck,
  loan: HandCoins,
  bank: Landmark,
  savings: PiggyBank,
  cibil: BadgeIndianRupee,
  passport: Fingerprint,
  licence: CarFront,
  gst: Store,
  itr: ReceiptText,
  company: Building2,
  compliance: FileCheck2,
  trade: BriefcaseBusiness,
  dsc: BadgeCheck,
  msme: Store,
  insurance: ShieldCheck,
} satisfies Record<string, LucideIcon>;

export const serviceIconMap: Record<string, LucideIcon> = {
  ...iconMap,
};

function parseAmount(price?: string) {
  if (!price) {
    return 0;
  }
  const value = Number(price.replace(/[^\d]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function buildFaqs(title: string, categorySlug: ServiceCategorySlug, priceLabel: string): ServiceFaq[] {
  return [
    {
      question: `How do I apply online for ${title}?`,
      answer: `You can initiate an application or submit an enquiry for ${title} through our DigiConnect Dukan portal. Our expert assistance team will review your details and guide you through the submission process.`,
    },
    {
      question: `What documents are required for ${title}?`,
      answer: "The required documents vary depending on the service. A basic list is shown on this page, and a finalized checklist will be shared with you on WhatsApp once our specialists begin processing your application.",
    },
    {
      question: `What are the charges for ${title}?`,
      answer: priceLabel === "Enquiry Now" ? "The final cost depends on the bank, government department guidelines, or specific case details. Our specialists will clarify charges beforehand." : `The current online support offer price for ${title} is ${priceLabel}.`,
    },
    {
      question: "Is fast same-day processing available?",
      answer: "Yes, fast processing and same-day verification support are available for select services when your required identity proofs and document uploads are clear and accurate.",
    },
    {
      question: `What is the role of ${parentCompany}?`,
      answer: `${companyName} is powered by ${parentCompany} to deliver organized PAN India digital assistance, secure form submissions, document verification, and expert customer follow-ups.`,
    },
  ];
}

function buildBlogContent(title: string, categorySlug: ServiceCategorySlug) {
  const audience = categoryCopy[categorySlug]?.audience || "Indian citizens needing documentation";
  return `If you are looking for secure, reliable online application support for ${title}, DigiConnect Dukan offers structured PAN India assistance. Backed by professional processes from ${parentCompany}, we guide you through every step of business filings, government registrations, banking, and insurance services. 

Navigating online portals can be challenging due to strict guidelines, complex document uploads, and validation steps. This service is designed specifically for ${audience} who need to get their filings done without delays. 

When you apply via DigiConnect Dukan, our specialists verify your forms, double-check spellings, verify database credentials, and contact you via WhatsApp for immediate support. This cuts down on friction and reduces the risk of rejection from official departments or banks. Choose safe, structured digital assistance with direct support today.`;
}

type RawService = {
  title: string;
  slug: string;
  categorySlug: ServiceCategorySlug;
  shortDescription: string;
  oldPrice?: string;
  offerPrice?: string;
  priceLabel?: string;
  iconKey: keyof typeof iconMap;
  badge?: string;
  documents?: string[];
  benefits?: string[];
};

function createService(raw: RawService): ServiceItem {
  const category = categoryCopy[raw.categorySlug];
  const priceLabel = raw.priceLabel ?? raw.offerPrice ?? "Enquiry Now";
  const hasFixedPrice = Boolean(raw.offerPrice);

  return {
    title: raw.title,
    slug: raw.slug,
    category: category.category,
    categorySlug: raw.categorySlug,
    shortDescription: raw.shortDescription,
    overview: `${raw.title} is a premier ${category.category} service from ${companyName} for customers needing guided online application assistance, verified document reviews, and professional follow-ups across India.`,
    benefits: raw.benefits ?? category.benefits,
    documents: raw.documents ?? category.docs,
    process: fixedProcess,
    oldPrice: raw.oldPrice,
    offerPrice: raw.offerPrice,
    priceLabel,
    amount: parseAmount(raw.offerPrice),
    ctaType: hasFixedPrice ? "apply" : "enquiry",
    icon: iconMap[raw.iconKey],
    badge: raw.badge ?? (hasFixedPrice ? "Limited Offer" : "Enquiry"),
    faqs: buildFaqs(raw.title, raw.categorySlug, priceLabel),
    reviews: fixedReviews,
    seoTitle: `${raw.title} Online Apply Support | ${companyName}`,
    seoDescription: `${raw.title} application guidance from ${companyName}. Safe online apply support, list of required documents, expert reviews, and WhatsApp assistance.`,
    seoKeywords: [
      raw.title,
      `${raw.title} online apply`,
      companyName,
      parentCompany,
      "document assistance",
      category.keyword,
      "government services",
      "India",
    ],
    blogContent: buildBlogContent(raw.title, raw.categorySlug),
  };
}

const rawServices: RawService[] = [
  // Cards & PVC Printing
  {
    title: "PVC Card",
    slug: "pvc-card",
    categorySlug: "cards",
    shortDescription: "Get your digital Aadhaar, PAN, Voter or DL printed on premium waterproof PVC smart cards.",
    oldPrice: "₹299",
    offerPrice: "₹149",
    iconKey: "card",
    badge: "Popular",
    documents: ["Front Side Image", "Back Side Image", "Delivery Address with Pincode"],
    benefits: ["Waterproof Polymer Core", "Premium Glossy Card Finish", "Fits Standard Wallet", "Doorstep Delivery"],
  },
  {
    title: "Voter ID",
    slug: "voter-id",
    categorySlug: "cards",
    shortDescription: "New Voter ID registration, details correction, and duplicate smart card printing assistance.",
    oldPrice: "₹349",
    offerPrice: "₹99",
    iconKey: "voter",
    badge: "New",
  },
  {
    title: "eShram Card",
    slug: "eshram-card",
    categorySlug: "cards",
    shortDescription: "UAN eShram registration assistance, worker profiling, and digital card print guidance.",
    oldPrice: "₹299",
    offerPrice: "₹149",
    iconKey: "labour",
    badge: "Quick Apply",
    documents: ["Aadhaar Card", "Mobile Number Linked to Aadhaar", "Bank Details"],
  },
  {
    title: "Labour Card",
    slug: "labour-card",
    categorySlug: "cards",
    shortDescription: "Labour Department registration support, renewal help, and state benefit schemes documentation.",
    oldPrice: "₹999",
    offerPrice: "₹399",
    iconKey: "labour",
    badge: "Popular",
  },

  // Loans & Government Schemes
  {
    title: "PMEGP Loan",
    slug: "pmegp-loan",
    categorySlug: "loans",
    shortDescription: "PMEGP subsidy business loans file preparation, project reporting, and online application support.",
    priceLabel: "Enquiry Now",
    iconKey: "loan",
    badge: "Popular",
  },
  {
    title: "Mudra Loan",
    slug: "mudra-loan",
    categorySlug: "loans",
    shortDescription: "Secure Mudra Business Loan documentation guidance for Shishu, Kishor, or Tarun categories.",
    priceLabel: "Enquiry Now",
    iconKey: "loan",
    badge: "Popular",
  },
  {
    title: "PM Vishwakarma Yojana",
    slug: "pm-vishwakarma-yojana",
    categorySlug: "loans",
    shortDescription: "PM Vishwakarma scheme registration assistance for eligible traditional artisans and craftsmen.",
    oldPrice: "₹499",
    offerPrice: "₹250",
    iconKey: "loan",
    badge: "Government",
    documents: ["Aadhaar Card", "Bank Account Details", "Ration Card or Family Proof", "Skill Category Name"],
  },
  {
    title: "Startup India Assistance",
    slug: "startup-india-assistance",
    categorySlug: "loans",
    shortDescription: "DPIIT startup registration support, tax exemptions advice, and business pitching deck checklist.",
    priceLabel: "Enquiry Now",
    iconKey: "bank",
    badge: "Business",
  },

  // Banking & Credit
  {
    title: "CM YUVA Entrepreneur Loan Assistance",
    slug: "cm-yuva-entrepreneur-loan-assistance",
    categorySlug: "banking",
    shortDescription: "Professional assistance for project reports, MSME registration, documentation support, and business loan applications.",
    priceLabel: "Enquiry Now",
    iconKey: "loan",
    badge: "Popular",
    documents: [
      "PAN Card",
      "Aadhaar Card",
      "Bank Passbook / Cancelled Cheque",
      "Educational Certificate",
      "Passport Size Photograph",
      "Business Details",
      "Business Address Proof"
    ],
    benefits: [
      "Comprehensive Project Report (DPR) preparation support",
      "MSME / Udyam registration certificate assistance",
      "Direct guidance for government interest subsidy schemes",
      "Step-by-step documentation review to minimize rejection risk",
      "Liaisoning and secure portal upload support"
    ]
  },
  {
    title: "Credit Cards",
    slug: "credit-cards",
    categorySlug: "banking",
    shortDescription: "Apply for top credit cards from leading banks with guided eligibility and documentation support.",
    priceLabel: "Enquiry Now",
    iconKey: "card",
    badge: "Popular",
  },
  {
    title: "Saving Account Opening",
    slug: "saving-account-opening",
    categorySlug: "banking",
    shortDescription: "Zero balance or premium savings account opening assistance with full KYC guidance.",
    priceLabel: "Enquiry Now",
    iconKey: "savings",
    badge: "Instant",
  },
  {
    title: "Current Account Opening",
    slug: "current-account-opening",
    categorySlug: "banking",
    shortDescription: "Open a business current account in top banks with trade certificate validation.",
    priceLabel: "Enquiry Now",
    iconKey: "bank",
    badge: "Business",
  },
  {
    title: "CIBIL Report & Increase",
    slug: "cibil-report-increase",
    categorySlug: "banking",
    shortDescription: "TransUnion CIBIL membership, comprehensive score analysis, and negative remarks disputing guide.",
    oldPrice: "₹3200",
    offerPrice: "₹2600",
    iconKey: "cibil",
    badge: "Credit Score",
    documents: ["Aadhaar Card", "PAN Card", "Mobile Number", "Email ID"],
  },

  // Passport & Licence
  {
    title: "Passport",
    slug: "passport",
    categorySlug: "licence",
    shortDescription: "Online Fresh/Reissue Passport application, slot scheduling, and document checks assistance.",
    oldPrice: "₹6499",
    offerPrice: "₹2499",
    iconKey: "passport",
    badge: "Popular",
  },
  {
    title: "Learning Driving License",
    slug: "learning-driving-license",
    categorySlug: "licence",
    shortDescription: "Apply online for your learner driving license, scheduling exam slot, and fee processing.",
    oldPrice: "₹2499",
    offerPrice: "₹1499",
    iconKey: "licence",
    badge: "Instant",
  },

  // Tax & GST
  {
    title: "GST Registration & Filing",
    slug: "gst-registration-filing",
    categorySlug: "tax",
    shortDescription: "Secure GST registration certificate and get timely assistance for GSTR filings.",
    oldPrice: "₹6999",
    offerPrice: "₹2499",
    iconKey: "gst",
    badge: "Popular",
  },
  {
    title: "ITR Filing",
    slug: "itr-filing",
    categorySlug: "tax",
    shortDescription: "Income tax return filing support for salary, business, and self-employment earnings.",
    oldPrice: "₹1499",
    offerPrice: "₹699",
    iconKey: "itr",
    badge: "Popular",
  },

  // Company Registration & Compliance
  {
    title: "Private Limited Registration",
    slug: "private-limited-registration",
    categorySlug: "company",
    shortDescription: "Incorporate a Private Limited company with SPICe+ form filings and ROC documentation.",
    priceLabel: "Enquiry Now",
    iconKey: "company",
    badge: "Corporate",
  },
  {
    title: "Private Limited Compliance",
    slug: "private-limited-compliance",
    categorySlug: "company",
    shortDescription: "Manage annual ROC compliance, DIR-3 KYC, and income tax audit checklist.",
    priceLabel: "Enquiry Now",
    iconKey: "compliance",
    badge: "Compliance",
  },
  {
    title: "OPC Registration",
    slug: "opc-registration",
    categorySlug: "company",
    shortDescription: "Register a One Person Company (OPC) with single-owner shares and directorship guide.",
    priceLabel: "Enquiry Now",
    iconKey: "trade",
    badge: "Startups",
  },
  {
    title: "DSC",
    slug: "dsc",
    categorySlug: "company",
    shortDescription: "Secure Class-3 Digital Signature Certificate (DSC) for secure online government e-filings.",
    priceLabel: "Enquiry Now",
    iconKey: "dsc",
    badge: "Secure",
  },
  {
    title: "MSME Registration",
    slug: "msme-registration",
    categorySlug: "company",
    shortDescription: "Register under MSME/Udyam to gain priority lending rates and government subsidies.",
    oldPrice: "₹1499",
    offerPrice: "₹699",
    iconKey: "msme",
    badge: "Popular",
  },
  {
    title: "ISO Certification",
    slug: "iso-certification",
    categorySlug: "company",
    shortDescription: "Acquire ISO 9001, 14001, 27001 standard certification documents for audits.",
    priceLabel: "Enquiry Now",
    iconKey: "insurance",
    badge: "Verified",
  },

  // Insurance
  {
    title: "Insurance",
    slug: "insurance",
    categorySlug: "insurance",
    shortDescription: "Get the best comprehensive or third-party insurance renewals for bike, car, or trucks.",
    priceLabel: "Enquiry Now",
    iconKey: "insurance",
    badge: "Secure",
  },
];

export const servicesData = rawServices.map(createService);

export function getServiceBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-registration",
    "msme-certificate": "msme-registration",
    "food-license": "insurance",
    "food-license-fssai": "insurance",
    passport: "passport",
    "passport-assistance": "passport",
    "pvc-card-printing": "pvc-card",
    "eshram-card-registration": "eshram-card",
    "labour-card-e-shram-card": "labour-card",
    "driving-licence": "learning-driving-license",
    "gst-registration": "gst-registration-filing",
    "cibil-report-analysis-and-credit-health-consultation": "cibil-report-increase",
    "cibil-credit-score-guidance": "cibil-report-increase",
    "credit-cards-all-banks": "credit-cards",
    "credit-cards---all-banks": "credit-cards",
    "savings-account-opening": "saving-account-opening",
    "savings-account": "saving-account-opening",
    "saving-account": "saving-account-opening",
    "bike-insurance": "insurance",
    "car-insurance": "insurance",
    "commercial-vehicle-insurance": "insurance",
    "insurance-renewal": "insurance",
  };

  const normalizedSlug = aliases[slug] ?? slug;
  return servicesData.find((service) => service.slug === normalizedSlug);
}

export function getServicesByCategory(categorySlug: ServiceCategorySlug) {
  return servicesData.filter((service) => service.categorySlug === categorySlug);
}

export function getCategoryBySlug(slug: string) {
  const aliases: Record<string, string> = {
    "tax-business": "tax",
    "finance-banking": "banking",
    "gov-id-form-submission": "licence",
    "digital-services": "cards",
  };
  const normalizedSlug = aliases[slug] ?? slug;
  return serviceCategories.find((category) => category.slug === normalizedSlug);
}

export function getFeaturedServices(categorySlug: ServiceCategorySlug) {
  const category = getCategoryBySlug(categorySlug);
  return (category?.featuredSlugs ?? [])
    .map((slug) => getServiceBySlug(slug))
    .filter((service): service is ServiceItem => Boolean(service));
}
