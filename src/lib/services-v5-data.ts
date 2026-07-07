// DigiConnect Dukan Services Platform V5 Enterprise Catalog Seeds
// Comprehensive seed structure for dynamic creation of services, variants, comparisons, and packages.

export interface SeedVariant {
  slug: string;
  name: string;
  description: string;
  original_price: number;
  selling_price: number;
  offer_price: number;
  agent_cost: number;
  partner_payout: number;
  wallet_cashback: number;
  wallet_redeem_allowed: boolean;
  gst_included: boolean;
  gst_percentage: number;
  timeline: string;
  government_fees: number;
  professional_fees: number;
  required_documents: { id: string; name: string; type: string; required: boolean }[];
  form_fields: { key: string; label: string; type: string; required: boolean; options?: string[] }[];
}

export interface SeedComparison {
  title: string;
  description: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface SeedService {
  slug: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  icon: string;
  banner_url?: string;
  color_theme: string;
  animation_key: string;
  popular?: boolean;
  trending?: boolean;
  recommended?: boolean;
  is_new?: boolean;
  is_government?: boolean;
  is_private?: boolean;
  original_price: number;
  selling_price: number;
  agent_cost: number;
  partner_payout: number;
  wallet_cashback: number;
  gst_included: boolean;
  gst_percentage: number;
  enquiry_only?: boolean;
  apply_online?: boolean;
  emi_allowed?: boolean;
  cod_allowed?: boolean;
  wallet_redeem_allowed?: boolean;
  
  // Targets
  target_financial?: boolean;
  target_business?: boolean;
  target_personal?: boolean;
  target_professional?: boolean;
  target_student?: boolean;
  target_senior_citizen?: boolean;
  target_women?: boolean;
  target_farmer?: boolean;
  target_business_owner?: boolean;
  target_nri?: boolean;

  // Details
  overview: string;
  benefits: string[];
  features: string[];
  eligibility: string[];
  who_should_apply: string[];
  who_should_not_apply: string[];
  advantages: string[];
  disadvantages: string[];
  timeline: string;
  validity: string;
  renewal: string;
  penalty: string;
  professional_fees: number;
  government_fees: number;
  refund_policy: string;
  cancellation_policy: string;
  checklist_url?: string;
  sample_certificate_url?: string;
  department: string;
  act: string;
  rules: string;
  important_notes: string;
  video_url?: string;
  pdf_url?: string;

  // FAQS & Reviews
  faqs: { question: string; answer: string }[];
  customer_reviews: { name: string; text: string; location: string }[];
  government_links: { name: string; url: string }[];
  latest_updates: { title: string; date: string; content: string }[];

  variants: SeedVariant[];
  comparisons: SeedComparison[];
}

export interface SeedPackage {
  slug: string;
  name: string;
  description: string;
  original_price: number;
  selling_price: number;
  agent_cost: number;
  partner_payout: number;
  wallet_cashback: number;
  items: { service_slug: string; variant_slug?: string }[];
}

export const SEED_SERVICES: SeedService[] = [
  {
    slug: "gst-registration",
    name: "GST Registration & Compliance",
    description: "Secure government GSTIN registration for business, sole proprietorship, partnerships, and LLP.",
    category: "TAX",
    sub_category: "GST Services",
    icon: "FileCheck2",
    banner_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80",
    color_theme: "from-blue-600 to-indigo-700",
    animation_key: "fade-up",
    popular: true,
    trending: true,
    recommended: true,
    is_new: false,
    is_government: true,
    is_private: false,
    original_price: 1999,
    selling_price: 999,
    agent_cost: 400,
    partner_payout: 350,
    wallet_cashback: 100,
    gst_included: true,
    gst_percentage: 18,
    enquiry_only: false,
    apply_online: true,
    emi_allowed: false,
    cod_allowed: false,
    target_business: true,
    target_business_owner: true,
    target_professional: true,
    overview: "Goods and Services Tax (GST) is an indirect tax used in India on the supply of goods and services. Registration is mandatory for businesses with turnover exceeding ₹20/40 Lakhs.",
    benefits: [
      "Legally recognized supplier of goods or services.",
      "Input Tax Credit (ITC) claim allowed on purchases.",
      "Inter-state sales enabled without restrictions.",
      "Seamless opening of current bank accounts."
    ],
    features: [
      "100% Online Document submission.",
      "Government portal filing by chartered professionals.",
      "Error-free ARN generation within 24 hours.",
      "Dedicated help desk and call support."
    ],
    eligibility: [
      "Any business with turnover > ₹20 Lakhs in hill/special states.",
      "Any business with turnover > ₹40 Lakhs in regular states.",
      "Inter-state suppliers and e-commerce portal sellers."
    ],
    who_should_apply: [
      "E-commerce sellers (Amazon, Flipkart, etc.).",
      "Service providers with national client base.",
      "Manufacturers and traders."
    ],
    who_should_not_apply: [
      "Agriculturists supplying local produce.",
      "Businesses dealing purely in tax-exempt items with low turnover."
    ],
    advantages: [
      "Increases business credibility.",
      "Reduces cascading effect of taxes."
    ],
    disadvantages: [
      "Requires monthly/quarterly filings (GSTR-1, GSTR-3B).",
      "Increases compliance overhead."
    ],
    timeline: "3 to 5 Working Days",
    validity: "Lifetime (unless cancelled or revoked)",
    renewal: "No renewal required.",
    penalty: "Filing delays attract fine of ₹50 per day (late fee).",
    professional_fees: 500,
    government_fees: 0,
    refund_policy: "100% refund if registration is rejected due to professional errors.",
    cancellation_policy: "Cancelable within 1 hour of fee payment.",
    checklist_url: "/docs/checklists/gst-checklist.pdf",
    sample_certificate_url: "/docs/samples/gst-cert.pdf",
    department: "Department of Revenue, Ministry of Finance",
    act: "Central Goods and Services Tax Act, 2017",
    rules: "GST Rules 2017 as updated",
    important_notes: "Aadhaar authentication is mandatory. Ensure Aadhaar is linked to an active mobile number.",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    pdf_url: "/docs/gst-guide.pdf",
    faqs: [
      { question: "Is GST mandatory for selling on Amazon?", answer: "Yes, GST registration is compulsory for e-commerce operators and sellers." },
      { question: "Can I cancel my GST registration later?", answer: "Yes, you can apply for GST cancellation online if business operations cease." }
    ],
    customer_reviews: [
      { name: "Rajesh Kumar", text: "Extremely fast service. Got my GSTIN within 3 days.", location: "Delhi" },
      { name: "Priya Sharma", text: "Very helpful team, guided me through the Aadhaar OTP verification process.", location: "Mumbai" }
    ],
    government_links: [
      { name: "Official GST Portal", url: "https://www.gst.gov.in" }
    ],
    latest_updates: [
      { title: "Biometric Aadhaar Authentication", date: "2026-06-01", content: "New biometric authentication rolled out in selected states to curb fake registrations." }
    ],
    variants: [
      {
        slug: "regular",
        name: "GST Regular Registration",
        description: "Standard GST registration allowing input tax credit claims.",
        original_price: 1999,
        selling_price: 999,
        offer_price: 999,
        agent_cost: 400,
        partner_payout: 350,
        wallet_cashback: 100,
        wallet_redeem_allowed: true,
        gst_included: true,
        gst_percentage: 18,
        timeline: "3 Days",
        government_fees: 0,
        professional_fees: 999,
        required_documents: [
          { id: "pan", name: "PAN Card", type: "Image", required: true },
          { id: "aadhaar", name: "Aadhaar Card", type: "Image", required: true },
          { id: "photo", name: "Passport Photo", type: "Image", required: true },
          { id: "address", name: "Electricity Bill / Rent Agreement", type: "PDF", required: true }
        ],
        form_fields: [
          { key: "legal_name", label: "Legal Name of Business", type: "text", required: true },
          { key: "trade_name", label: "Trade Name", type: "text", required: true },
          { key: "constitution", label: "Constitution of Business", type: "dropdown", required: true, options: ["Proprietorship", "Partnership", "LLP", "Private Limited"] }
        ]
      },
      {
        slug: "composition",
        name: "GST Composition Scheme",
        description: "Simplified GST registration with lower tax rates and minimal compliance.",
        original_price: 2499,
        selling_price: 1499,
        offer_price: 1499,
        agent_cost: 600,
        partner_payout: 500,
        wallet_cashback: 150,
        wallet_redeem_allowed: true,
        gst_included: true,
        gst_percentage: 18,
        timeline: "3 Days",
        government_fees: 0,
        professional_fees: 1499,
        required_documents: [
          { id: "pan", name: "PAN Card", type: "Image", required: true },
          { id: "aadhaar", name: "Aadhaar Card", type: "Image", required: true },
          { id: "photo", name: "Passport Photo", type: "Image", required: true },
          { id: "address", name: "Electricity Bill", type: "PDF", required: true }
        ],
        form_fields: [
          { key: "legal_name", label: "Legal Name", type: "text", required: true },
          { key: "estimated_turnover", label: "Estimated Annual Turnover (₹)", type: "number", required: true }
        ]
      }
    ],
    comparisons: [
      {
        title: "GST Regular vs Composition",
        description: "Choose the right taxation system for your firm.",
        headers: ["Feature", "Regular GST", "Composition GST"],
        rows: [
          { feature: "Tax Rate", v1: "Standard (5%, 12%, 18%, 28%)", v2: "Low (1% to 6%)" },
          { feature: "Input Tax Credit", v1: "Allowed to claim and pass on", v2: "Not allowed" },
          { feature: "Interstate Sales", v1: "Permitted nationwide", v2: "Restricted to home state" },
          { feature: "Returns Filing", v1: "Monthly / Quarterly GSTR-1, 3B", v2: "Quarterly CMP-08, Annual GSTR-4" }
        ]
      }
    ]
  },
  {
    slug: "passport",
    name: "Indian Passport Application Assistance",
    description: "Assistance with Fresh, Reissue, Tatkaal, or Minor Indian Passport slot booking and documentation.",
    category: "gov-id",
    sub_category: "Passport Services",
    icon: "IdCard",
    banner_url: "https://images.unsplash.com/photo-1544016768-982d1554f0b9?w=1200&auto=format&fit=crop&q=80",
    color_theme: "from-orange-600 to-amber-700",
    animation_key: "fade-left",
    popular: true,
    trending: false,
    recommended: true,
    is_new: false,
    is_government: true,
    is_private: false,
    original_price: 1500,
    selling_price: 499,
    agent_cost: 200,
    partner_payout: 150,
    wallet_cashback: 50,
    gst_included: true,
    gst_percentage: 18,
    enquiry_only: false,
    apply_online: true,
    emi_allowed: false,
    cod_allowed: false,
    target_student: true,
    target_senior_citizen: true,
    target_personal: true,
    overview: "Official submission and scheduling assistance for obtaining or renewing an Indian Passport under Ministry of External Affairs rules.",
    benefits: [
      "Official valid Global Identity and Citizenship proof.",
      "Enables international visa approvals and travel.",
      "Fastest address and identity checking document."
    ],
    features: [
      "Slot scheduling in nearby PSK within 10 minutes.",
      "Document pre-verification by support desk.",
      "Tatkaal express support."
    ],
    eligibility: [
      "Any Indian citizen residing in India or abroad."
    ],
    who_should_apply: [
      "Citizens seeking overseas work, studies, or holiday.",
      "People needing passport reissue due to damage or page exhaustion."
    ],
    who_should_not_apply: [
      "Individuals facing pending court criminal charges without clearance."
    ],
    advantages: [
      "Globally accepted KYC.",
      "Simplifies visa process."
    ],
    disadvantages: [
      "Physical visit to PSK is mandatory.",
      "Subject to strict police verification."
    ],
    timeline: "Normal: 15 Days | Tatkaal: 3 Days",
    validity: "Adults: 10 Years | Minors: 5 Years",
    renewal: "Renewal required before expiry.",
    penalty: "Applying with fake or hidden information attracts high fines.",
    professional_fees: 499,
    government_fees: 1500,
    refund_policy: "Refund of professional fees if slot booking fails.",
    cancellation_policy: "Slots can be rescheduled up to 3 times for free.",
    department: "Consular, Passport & Visa Division, Ministry of External Affairs",
    act: "Passports Act, 1967",
    rules: "Passport Rules 1980",
    important_notes: "Aadhaar Card, Birth Proof (or 10th marksheet), and Active Address Proof are required.",
    faqs: [
      { question: "Is police verification mandatory?", answer: "Yes, for most fresh and renewal passports, police verification is required." }
    ],
    customer_reviews: [
      { name: "Alok Dwivedi", text: "Booked my Tatkaal slot immediately. Great support.", location: "Kanpur" }
    ],
    government_links: [
      { name: "Passport Seva Portal", url: "https://www.passportindia.gov.in" }
    ],
    latest_updates: [
      { title: "E-Passports Launch", date: "2026-05-15", content: "Chip-based secure e-passports are being rolled out in phases for all fresh applications." }
    ],
    variants: [
      {
        slug: "normal",
        name: "Normal Passport Service (36 Pages)",
        description: "Standard processing time for fresh passport or reissue.",
        original_price: 999,
        selling_price: 499,
        offer_price: 499,
        agent_cost: 200,
        partner_payout: 150,
        wallet_cashback: 50,
        wallet_redeem_allowed: true,
        gst_included: true,
        gst_percentage: 18,
        timeline: "15 Days",
        government_fees: 1500,
        professional_fees: 499,
        required_documents: [
          { id: "aadhaar", name: "Aadhaar Card", type: "Image", required: true },
          { id: "dob", name: "10th Marksheet or Birth Certificate", type: "PDF", required: true },
          { id: "address", name: "Rent / Electricity bill / Bank Passbook", type: "PDF", required: true }
        ],
        form_fields: [
          { key: "full_name", label: "Full Name (As in Aadhaar)", type: "text", required: true },
          { key: "dob", label: "Date of Birth", type: "date", required: true },
          { key: "gender", label: "Gender", type: "dropdown", required: true, options: ["Male", "Female", "Transgender"] }
        ]
      },
      {
        slug: "tatkal",
        name: "Tatkaal Passport Service (36 Pages)",
        description: "Express slot booking and issue within 3 days.",
        original_price: 1999,
        selling_price: 999,
        offer_price: 999,
        agent_cost: 400,
        partner_payout: 300,
        wallet_cashback: 100,
        wallet_redeem_allowed: true,
        gst_included: true,
        gst_percentage: 18,
        timeline: "3 Days",
        government_fees: 3500,
        professional_fees: 999,
        required_documents: [
          { id: "aadhaar", name: "Aadhaar Card", type: "Image", required: true },
          { id: "dob", name: "10th Certificate", type: "PDF", required: true },
          { id: "annexure", name: "Verification Certificate / Annexure F", type: "PDF", required: true }
        ],
        form_fields: [
          { key: "full_name", label: "Full Name", type: "text", required: true },
          { key: "dob", label: "Date of Birth", type: "date", required: true }
        ]
      }
    ],
    comparisons: [
      {
        title: "Normal vs Tatkaal Passport",
        description: "Decide which service suits your travel emergency.",
        headers: ["Feature", "Normal Passport", "Tatkaal Passport"],
        rows: [
          { feature: "Filing processing time", v1: "15 to 20 working days", v2: "2 to 4 working days" },
          { feature: "Official Govt Fee", v1: "₹1,500 (36 pages)", v2: "₹3,500 (₹1500 regular + ₹2000 cash at PSK)" },
          { feature: "Verification", v1: "Standard police verification", v2: "Pre-verified or post-verified based on documents" }
        ]
      }
    ]
  }
];

export const SEED_PACKAGES: SeedPackage[] = [
  {
    slug: "gst-starter-bundle",
    name: "GST & Business Launch Starter",
    description: "Launch your business with GST registration and MSME registration in one click.",
    original_price: 2499,
    selling_price: 1299,
    agent_cost: 500,
    partner_payout: 400,
    wallet_cashback: 150,
    items: [
      { service_slug: "gst-registration", variant_slug: "regular" }
    ]
  }
];
