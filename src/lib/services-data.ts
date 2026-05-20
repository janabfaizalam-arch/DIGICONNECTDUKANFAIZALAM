import {
  BadgeIndianRupee,
  Banknote,
  Bike,
  BriefcaseBusiness,
  Building2,
  Bus,
  CarFront,
  ClipboardCheck,
  CreditCard,
  FileBadge2,
  FileCheck2,
  FileText,
  HandCoins,
  IdCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Store,
  Tractor,
  Truck,
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
  "tax-business": {
    category: "Tax & Business",
    keyword: "business registration",
    audience: "shop owners, traders, online sellers, startups, contractors, and small business owners",
    docs: ["Aadhaar Card", "PAN Card", "Photo", "Mobile Number", "Business Details", "Address Proof"],
    benefits: [
      "Business document checklist before submission",
      "Online apply support with clear guidance",
      "Proper review of personal and business details",
      "WhatsApp support for document assistance",
      "Useful for shops, firms, traders, and startups",
      "Fast Service - Same Day Process Available for ready documents",
    ],
  },
  insurance: {
    category: "Insurance",
    keyword: "insurance service",
    audience: "vehicle owners, drivers, transport businesses, fleet operators, and policy holders",
    docs: ["RC Copy", "Previous Policy", "Aadhaar Card", "PAN Card", "Mobile Number", "Vehicle Photo if required"],
    benefits: [
      "Multiple vehicle insurance options in one place",
      "Third party and comprehensive policy guidance",
      "Renewal support before policy expiry",
      "WhatsApp support for quote and document assistance",
      "Claim guidance for accident or damage cases",
      "Fast Service - Same Day Process Available for eligible cases",
    ],
  },
  "finance-banking": {
    category: "Finance & Banking",
    keyword: "finance service",
    audience: "entrepreneurs, self-employed workers, farmers, shopkeepers, startups, and banking customers",
    docs: ["Aadhaar Card", "PAN Card", "Bank Statement", "Photo", "Business Proof", "Income or Project Details"],
    benefits: [
      "Government subsidy loan scheme guidance",
      "Loan file and document assistance",
      "Banking product support from enquiry to submission",
      "Eligibility discussion before online apply",
      "Business and self-employment planning support",
      "Fast Service - Same Day Process Available for document-ready files",
    ],
  },
  "gov-id-form-submission": {
    category: "Gov ID & Form Submission",
    keyword: "government services",
    audience: "students, families, workers, drivers, travellers, and Indian citizens needing document support",
    docs: ["Aadhaar Card", "PAN Card if available", "Photo", "Mobile Number", "Address Proof", "Supporting Document if required"],
    benefits: [
      "Simple form submission support",
      "Clear document checklist before applying",
      "Correction and new application guidance",
      "Online apply assistance across India",
      "WhatsApp updates and follow-up support",
      "Fast Service - Same Day Process Available for selected services",
    ],
  },
};

export const serviceCategories: ServiceCategory[] = [
  {
    title: "Tax & Business",
    slug: "tax-business",
    heading: "Tax & Business Services",
    description: "GST, ITR, MSME, FSSAI, trade license, and project report support for growing businesses.",
    icon: Building2,
    featuredSlugs: ["gst-registration", "itr-filing", "msme-certificate", "food-license-fssai"],
  },
  {
    title: "Insurance",
    slug: "insurance",
    heading: "All Vehicle Insurance",
    description: "Premium cards for bike, car, commercial, third party, comprehensive, renewal, and claim assistance.",
    icon: ShieldCheck,
    featuredSlugs: ["bike-insurance", "car-insurance", "commercial-vehicle-insurance", "insurance-renewal"],
  },
  {
    title: "Finance & Banking",
    slug: "finance-banking",
    heading: "Finance, Banking & Government Subsidy Loans",
    description: "Government subsidy schemes, business loans, credit cards, accounts, CIBIL, and loan file preparation.",
    icon: Landmark,
    featuredSlugs: ["pmegp-loan", "mudra-loan", "pm-vishwakarma-yojana", "msme-business-loan"],
  },
  {
    title: "Gov ID & Form Submission",
    slug: "gov-id-form-submission",
    heading: "Gov ID & Form Submission",
    description: "PAN, passport, driving licence, voter ID, and labour or e-Shram card application assistance.",
    icon: IdCard,
    featuredSlugs: ["passport-assistance", "driving-licence", "voter-id", "labour-card-e-shram-card"],
  },
];

const fixedReviews: ServiceReview[] = [
  { name: "Amit Kumar", location: "Lucknow", text: "Fast service and proper guidance." },
  { name: "Shabana Parveen", location: "Barabanki", text: "Documents process bahut easy ho gaya." },
  { name: "Rohit Verma", location: "Kanpur", text: "Good support on WhatsApp." },
];

const fixedProcess = ["Apply", "Submit documents", "Verification", "Get service completed"];

const iconMap = {
  gst: Building2,
  itr: ReceiptText,
  msme: Store,
  food: FileBadge2,
  trade: BriefcaseBusiness,
  dpr: FileText,
  bike: Bike,
  car: CarFront,
  commercial: Truck,
  auto: CarFront,
  tractor: Tractor,
  truck: Truck,
  erickshaw: Bike,
  bus: Bus,
  taxi: CarFront,
  loading: Truck,
  insurance: ShieldCheck,
  loan: HandCoins,
  bank: Landmark,
  card: CreditCard,
  cibil: BadgeIndianRupee,
  pan: FileCheck2,
  passport: ShieldCheck,
  licence: CarFront,
  voter: IdCard,
  labour: ClipboardCheck,
  savings: PiggyBank,
  account: Banknote,
} satisfies Record<string, LucideIcon>;

export const serviceIconMap: Record<string, LucideIcon> = {
  ...iconMap,
  BadgeIndianRupee,
  Banknote,
  Bike,
  BriefcaseBusiness,
  Building2,
  Bus,
  CarFront,
  ClipboardCheck,
  CreditCard,
  FileBadge2,
  FileCheck2,
  FileText,
  HandCoins,
  IdCard,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Store,
  Tractor,
  Truck,
};

function parseAmount(price?: string) {
  if (!price) {
    return 0;
  }

  const value = Number(price.replace(/[^\d]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildFaqs(title: string, categorySlug: ServiceCategorySlug, priceLabel: string): ServiceFaq[] {
  const { keyword } = categoryCopy[categorySlug];

  return [
    {
      question: `${title} ke liye online apply kaise karein?`,
      answer: `${companyName} par aap enquiry ya application start kar sakte hain. Team documents check karke next step batati hai.`,
    },
    {
      question: `${title} ke liye kaunse documents chahiye?`,
      answer: "Basic documents service ke hisaab se alag ho sakte hain. Page par document list di gayi hai aur WhatsApp par final checklist mil jati hai.",
    },
    {
      question: `${title} ka price kya hai?`,
      answer: priceLabel === "Enquiry Now" ? "Is service ka price case, location, bank, department, ya policy details ke hisaab se confirm hota hai." : `${title} ka current offer price ${priceLabel} hai.`,
    },
    {
      question: "Kya same day process available hai?",
      answer: "Fast Service - Same Day Process Available selected cases mein hoti hai jab documents ready aur details correct hoti hain.",
    },
    {
      question: `${parentCompany} ka role kya hai?`,
      answer: `${companyName} is operated with professional support from ${parentCompany} for organized document assistance, ${keyword}, and customer follow-up across India.`,
    },
  ];
}

function buildBlogContent(title: string, categorySlug: ServiceCategorySlug) {
  const { audience } = categoryCopy[categorySlug];

  return `${title} ke liye reliable online apply support chahiye to DigiConnect Dukan ek practical aur customer-friendly option hai. RNOS India Pvt Ltd ke professional process ke saath yahan par customers ko document assistance, form guidance, enquiry support, aur application follow-up ek organized flow mein milta hai. India mein government services, business registration, insurance service, aur finance service jaise kaam aksar documents, eligibility, portal details, aur verification steps ki wajah se confusing ho jate hain. Isi gap ko simple banane ke liye DigiConnect Dukan service page par clear overview, documents required, process, pricing, FAQ, aur WhatsApp CTA diya gaya hai.

${title} service un logon ke liye useful hai jo ${audience} hain aur apna kaam bina unnecessary delay ke complete karwana chahte hain. Customer ko pehle service ka purpose samjhaya jata hai, phir document checklist share hoti hai. Agar kisi document mein spelling mismatch, mobile number issue, old record, policy expiry, bank statement, project report, ya eligibility related doubt ho, to team pehle guidance deti hai. Isse online apply karte waqt galti ki possibility kam hoti hai aur customer ko baar-baar department, bank, ya agent ke chakkar nahi lagane padte.

DigiConnect Dukan ka focus sirf form submit karna nahi hai. Yahan process ko trust aur conversion dono ke hisaab se design kiya gaya hai. Customer ko Apply Now, Enquiry Now, Call / WhatsApp Now, aur Fast Service - Same Day Process Available jaise clear action options milte hain. Fixed-price services mein old price aur offer price transparent dikhaya jata hai. Jahan service case-based hai, wahan Enquiry Now option diya gaya hai taaki team customer ke documents, location, vehicle details, bank requirement, ya scheme eligibility dekh kar exact guidance de sake.

India mein online services ka demand fast badh raha hai, lekin har customer ko portal language, document size, upload format, secure payment, status tracking, aur final submission ka confidence nahi hota. Isi liye DigiConnect Dukan document assistance ko simple Hindi-English support ke saath provide karta hai. ${title} ke liye aap basic details submit kar sakte hain, documents share kar sakte hain, verification ke baad process start karwa sakte hain, aur completion update call ya WhatsApp par le sakte hain. Aaj hi apply karein, ya Call karein ya WhatsApp par message bhejein for quick help.`;
}

type RawService = {
  title: string;
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
  const slug = makeSlug(raw.title);
  const priceLabel = raw.priceLabel ?? raw.offerPrice ?? "Enquiry Now";
  const hasFixedPrice = Boolean(raw.offerPrice);

  return {
    title: raw.title,
    slug,
    category: category.category,
    categorySlug: raw.categorySlug,
    shortDescription: raw.shortDescription,
    overview: `${raw.title} is a ${category.category} service from ${companyName} for customers who need guided online apply support, document assistance, and professional follow-up across India.`,
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
    seoTitle: `${raw.title} Online Apply | ${companyName}`,
    seoDescription: `${raw.title} service by ${companyName}. Get online apply support, document assistance, pricing, reviews, FAQ, and WhatsApp enquiry across India.`,
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
  { title: "GST Registration", categorySlug: "tax-business", shortDescription: "Start GST registration with document guidance for your business.", oldPrice: "₹6999", offerPrice: "₹2499", iconKey: "gst", badge: "Popular" },
  { title: "ITR Filing", categorySlug: "tax-business", shortDescription: "Income tax return filing support with simple document collection.", oldPrice: "₹1499", offerPrice: "₹699", iconKey: "itr", badge: "Limited Offer" },
  { title: "MSME Certificate", categorySlug: "tax-business", shortDescription: "Udyam/MSME certificate support for small business benefits.", oldPrice: "₹1499", offerPrice: "₹699", iconKey: "msme", badge: "Popular" },
  { title: "Food License / FSSAI", categorySlug: "tax-business", shortDescription: "Food business registration assistance for FSSAI license.", oldPrice: "₹1499", offerPrice: "₹699", iconKey: "food", badge: "Limited Offer" },
  { title: "Trade License", categorySlug: "tax-business", shortDescription: "Trade license and local business permission document support.", priceLabel: "Enquiry Now", iconKey: "trade" },
  { title: "DPR Project Report", categorySlug: "tax-business", shortDescription: "Project report preparation support for loan and subsidy files.", priceLabel: "Enquiry Now", iconKey: "dpr" },

  { title: "Bike Insurance", categorySlug: "insurance", shortDescription: "Two-wheeler insurance quote, renewal, and policy support.", priceLabel: "Enquiry Now", iconKey: "bike", badge: "Popular" },
  { title: "Car Insurance", categorySlug: "insurance", shortDescription: "Private car insurance options with renewal and quote assistance.", priceLabel: "Enquiry Now", iconKey: "car", badge: "Popular" },
  { title: "Commercial Vehicle Insurance", categorySlug: "insurance", shortDescription: "Commercial vehicle policy support for business and transport use.", priceLabel: "Enquiry Now", iconKey: "commercial" },
  { title: "Auto Rickshaw Insurance", categorySlug: "insurance", shortDescription: "Auto rickshaw insurance renewal and third-party quote help.", priceLabel: "Enquiry Now", iconKey: "auto" },
  { title: "Tractor Insurance", categorySlug: "insurance", shortDescription: "Tractor insurance support for agriculture and commercial needs.", priceLabel: "Enquiry Now", iconKey: "tractor" },
  { title: "Truck Insurance", categorySlug: "insurance", shortDescription: "Truck insurance assistance for goods carriers and transport owners.", priceLabel: "Enquiry Now", iconKey: "truck" },
  { title: "E-Rickshaw Insurance", categorySlug: "insurance", shortDescription: "E-rickshaw policy enquiry, renewal, and document assistance.", priceLabel: "Enquiry Now", iconKey: "erickshaw" },
  { title: "Bus Insurance", categorySlug: "insurance", shortDescription: "Bus insurance quote support for passenger and commercial vehicles.", priceLabel: "Enquiry Now", iconKey: "bus" },
  { title: "Taxi / Cab Insurance", categorySlug: "insurance", shortDescription: "Taxi and cab policy assistance for drivers and fleet owners.", priceLabel: "Enquiry Now", iconKey: "taxi" },
  { title: "Loading Vehicle Insurance", categorySlug: "insurance", shortDescription: "Loading vehicle insurance support for goods and carrier vehicles.", priceLabel: "Enquiry Now", iconKey: "loading" },
  { title: "Third Party Insurance", categorySlug: "insurance", shortDescription: "Mandatory third-party insurance enquiry and renewal support.", priceLabel: "Enquiry Now", iconKey: "insurance", badge: "Popular" },
  { title: "Comprehensive Insurance", categorySlug: "insurance", shortDescription: "Own damage plus third-party policy guidance for vehicles.", priceLabel: "Enquiry Now", iconKey: "insurance" },
  { title: "Insurance Renewal", categorySlug: "insurance", shortDescription: "Renew expired or running insurance with quick document assistance.", priceLabel: "Enquiry Now", iconKey: "insurance", badge: "Popular" },
  { title: "Insurance Claim Assistance", categorySlug: "insurance", shortDescription: "Claim document guidance and support after accident or damage.", priceLabel: "Enquiry Now", iconKey: "insurance" },

  { title: "PMEGP Loan", categorySlug: "finance-banking", shortDescription: "PMEGP subsidy loan guidance for new business projects.", priceLabel: "Enquiry Now", iconKey: "loan", badge: "Popular" },
  { title: "Mudra Loan", categorySlug: "finance-banking", shortDescription: "Mudra loan enquiry and document support for small businesses.", priceLabel: "Enquiry Now", iconKey: "loan", badge: "Popular" },
  { title: "Stand-Up India Loan", categorySlug: "finance-banking", shortDescription: "Stand-Up India loan assistance for eligible entrepreneurs.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "PM Vishwakarma Yojana", categorySlug: "finance-banking", shortDescription: "PM Vishwakarma scheme guidance for eligible artisans and workers.", oldPrice: "Rs 0", offerPrice: "Rs 0", priceLabel: "Login to Apply", iconKey: "loan", badge: "Popular" },
  { title: "PM SVANidhi Loan", categorySlug: "finance-banking", shortDescription: "Street vendor loan support with document and eligibility guidance.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Dairy Loan", categorySlug: "finance-banking", shortDescription: "Dairy business loan file and subsidy scheme document support.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Poultry Farm Loan", categorySlug: "finance-banking", shortDescription: "Poultry farm project loan guidance and file preparation support.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Goat Farming Loan", categorySlug: "finance-banking", shortDescription: "Goat farming loan scheme guidance and project document support.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Agriculture Loan", categorySlug: "finance-banking", shortDescription: "Agriculture loan support for farmers and agri-business needs.", priceLabel: "Enquiry Now", iconKey: "tractor" },
  { title: "KCC - Kisan Credit Card", categorySlug: "finance-banking", shortDescription: "Kisan Credit Card guidance for farmers and agriculture finance.", priceLabel: "Enquiry Now", iconKey: "card" },
  { title: "MSME Business Loan", categorySlug: "finance-banking", shortDescription: "MSME business loan enquiry and file preparation assistance.", priceLabel: "Enquiry Now", iconKey: "loan", badge: "Popular" },
  { title: "Startup India Assistance", categorySlug: "finance-banking", shortDescription: "Startup India registration and funding document guidance.", priceLabel: "Enquiry Now", iconKey: "bank" },
  { title: "CGTMSE Loan", categorySlug: "finance-banking", shortDescription: "Collateral-free business loan guidance under CGTMSE options.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Self Employment Loan", categorySlug: "finance-banking", shortDescription: "Self-employment loan support for new and existing ventures.", priceLabel: "Enquiry Now", iconKey: "loan" },
  { title: "Credit Cards - All Banks", categorySlug: "finance-banking", shortDescription: "Credit card enquiry and guidance for multiple bank options.", priceLabel: "Enquiry Now", iconKey: "card" },
  { title: "Bank Account Opening", categorySlug: "finance-banking", shortDescription: "Bank account opening assistance with document checklist support.", priceLabel: "Enquiry Now", iconKey: "account" },
  { title: "Current Account Opening", categorySlug: "finance-banking", shortDescription: "Current account opening support for shops and businesses.", priceLabel: "Enquiry Now", iconKey: "bank" },
  { title: "Savings Account Opening", categorySlug: "finance-banking", shortDescription: "Savings account guidance with basic KYC document support.", priceLabel: "Enquiry Now", iconKey: "savings" },
  { title: "Loan File Preparation", categorySlug: "finance-banking", shortDescription: "Loan file, project details, and document arrangement support.", priceLabel: "Enquiry Now", iconKey: "dpr" },
  { title: "CIBIL / Credit Score Guidance", categorySlug: "finance-banking", shortDescription: "Credit score review guidance for better loan readiness.", priceLabel: "Enquiry Now", iconKey: "cibil" },

  { title: "PAN Card", categorySlug: "gov-id-form-submission", shortDescription: "PAN card application, correction, and reprint assistance.", oldPrice: "₹399", offerPrice: "₹99", iconKey: "pan", badge: "Limited Offer" },
  { title: "Passport Assistance", categorySlug: "gov-id-form-submission", shortDescription: "Passport form, appointment, and document checklist support.", oldPrice: "₹6499", offerPrice: "₹2499", iconKey: "passport", badge: "Popular" },
  { title: "Driving Licence", categorySlug: "gov-id-form-submission", shortDescription: "Driving licence application and renewal support.", oldPrice: "₹1999", offerPrice: "₹1099", iconKey: "licence", badge: "Limited Offer" },
  { title: "Voter ID", categorySlug: "gov-id-form-submission", shortDescription: "Voter ID application and correction form assistance.", oldPrice: "₹349", offerPrice: "₹99", iconKey: "voter", badge: "Limited Offer" },
  { title: "Labour Card / e-Shram Card", categorySlug: "gov-id-form-submission", shortDescription: "Labour card and e-Shram card registration assistance.", oldPrice: "₹999", offerPrice: "₹399", iconKey: "labour", badge: "Popular" },
];

export const servicesData = rawServices.map(createService);

export function getServiceBySlug(slug: string) {
  const aliases: Record<string, string> = {
    msme: "msme-certificate",
    "food-license": "food-license-fssai",
    passport: "passport-assistance",
  };

  return servicesData.find((service) => service.slug === (aliases[slug] ?? slug));
}

export function getServicesByCategory(categorySlug: ServiceCategorySlug) {
  return servicesData.filter((service) => service.categorySlug === categorySlug);
}

export function getCategoryBySlug(slug: string) {
  return serviceCategories.find((category) => category.slug === slug);
}

export function getFeaturedServices(categorySlug: ServiceCategorySlug) {
  const category = getCategoryBySlug(categorySlug);

  return (category?.featuredSlugs ?? [])
    .map((slug) => getServiceBySlug(slug))
    .filter((service): service is ServiceItem => Boolean(service));
}
