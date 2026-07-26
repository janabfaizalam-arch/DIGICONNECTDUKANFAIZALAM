export type FieldType = "text" | "number" | "email" | "tel" | "select" | "textarea" | "checkbox";

export interface FieldValidation {
  pattern?: string;
  errorMessage?: string;
  ruleType?: "pan" | "aadhaar" | "gstin" | "email" | "phone" | "pincode" | "ifsc" | "bank_account" | "passport_number" | "dl_number";
}

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
  helpHint?: string;
}

export interface FormSectionSchema {
  id: string;
  title: string;
  fields: FieldSchema[];
}

export interface DocumentRequirement {
  id: string;
  name: string;
  required: boolean;
  ocrType?: "aadhaar" | "pan" | "passport" | "dl" | "voter_id" | "gst_cert";
  helpHint?: string;
}

export interface PlanSchema {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface ServiceConfig {
  slug: string;
  categorySlug: string;
  formSections: FormSectionSchema[];
  documents: DocumentRequirement[];
  plans?: PlanSchema[];
  govFee: number;
  serviceCharge: number;
  processingTime: string;
  successMessage?: string;
}

// Full configuration catalog for all Indian digital services
export const SERVICES_CONFIG_REGISTRY: ServiceConfig[] = [
  {
    slug: "passport",
    categorySlug: "licence",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "7-10 Working Days",
    successMessage: "Passport online file submitted. Our coordinator will contact you via WhatsApp with appointment slot options.",
    plans: [
      { id: "normal", name: "Normal Processing", price: 0, description: "Standard passport file creation and RPO scheduling" },
      { id: "tatkal", name: "Tatkal Speed Processing", price: 0, description: "Fast track Tatkal file submission and urgent slots" }
    ],
    documents: [
      { id: "aadhaar", name: "Aadhaar Card Copy", required: true, ocrType: "aadhaar", helpHint: "Must have complete DOB (DD/MM/YYYY)" },
      { id: "pan", name: "PAN Card Copy", required: true, ocrType: "pan" },
      { id: "birth_proof", name: "Birth Certificate or 10th Marksheet", required: true },
      { id: "signature", name: "Specimen Signature", required: true },
      { id: "photo", name: "Passport Photo", required: true }
    ],
    formSections: [
      {
        id: "passport_type",
        title: "Application Category",
        fields: [
          { name: "appType", label: "Application Type", type: "select", options: ["Fresh Passport", "Re-issue / Renewal"], required: true },
          { name: "pages", label: "Booklet Size", type: "select", options: ["36 Pages", "60 Pages"], required: true },
          { name: "policeStation", label: "Nearest Police Station", type: "text", required: true, placeholder: "Local police station name" }
        ]
      },
      {
        id: "passport_personal",
        title: "Personal Identity Details",
        fields: [
          { name: "birthPlace", label: "Place of Birth", type: "text", required: true, placeholder: "City / Village of birth" },
          { name: "maritalStatus", label: "Marital Status", type: "select", options: ["Single", "Married", "Divorced", "Widowed"], required: true },
          { name: "education", label: "Highest Education Level", type: "select", options: ["Below 10th (Non-ECR)", "10th Class (ECR)", "12th Class or Graduate (Non-ECR)"], required: true }
        ]
      }
    ]
  },
  {
    slug: "gst-registration",
    categorySlug: "tax",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "3-5 Working Days",
    successMessage: "GST registration dossier sent to GSTN processor. Check updates in dashboard.",
    plans: [
      { id: "basic", name: "Basic Registration", price: 0, description: "Standard business registration & ARN generation" },
      { id: "msme", name: "GST + MSME Bundle", price: 0, description: "GSTIN registration plus Udyam Certificate" },
      { id: "starter", name: "Business Starter Pack", price: 0, description: "GST, MSME, Business consultations and GST compliance checklist" }
    ],
    documents: [
      { id: "pan", name: "PAN of Business/Proprietor", required: true, ocrType: "pan" },
      { id: "aadhaar", name: "Aadhaar of Proprietor", required: true, ocrType: "aadhaar" },
      { id: "address_proof", name: "Premises Address Proof (Electricity bill/Tax receipt)", required: true },
      { id: "noc", name: "NOC from Owner (If rented premises)", required: true },
      { id: "photo", name: "Passport Photo of Proprietor", required: true }
    ],
    formSections: [
      {
        id: "business_info",
        title: "Business Particulars",
        fields: [
          { name: "businessName", label: "Legal Trade Name", type: "text", required: true, placeholder: "Shop / Firm name as on PAN" },
          {
            name: "businessType",
            label: "Constitution of Business",
            type: "select",
            options: ["Sole Proprietorship", "Partnership Firm", "LLP", "Private Limited Company", "Hindu Undivided Family (HUF)"],
            required: true
          },
          {
            name: "businessPan",
            label: "Business PAN",
            type: "text",
            required: true,
            placeholder: "10-character PAN",
            validation: { ruleType: "pan" }
          }
        ]
      },
      {
        id: "tax_details",
        title: "GST Parameters",
        fields: [
          { name: "natureOfBusiness", label: "Primary Business Activity", type: "select", options: ["Retail Trade", "Wholesale Trade", "Manufacturing", "Services Provider", "Import/Export"], required: true },
          { name: "turnover", label: "Estimated Annual Turnover (Lakhs)", type: "number", required: true, placeholder: "e.g. 25" }
        ]
      }
    ]
  },
  {
    slug: "itr-filing",
    categorySlug: "tax",
    govFee: 0,
    serviceCharge: 499,
    processingTime: "2-3 Working Days",
    successMessage: "Your ITR application is submitted. Track document review and filing progress in your dashboard.",
    plans: [
      { id: "basic", name: "Basic ITR", price: 499, description: "Simple salary / interest returns — starting from ₹499" },
      { id: "professional", name: "Professional ITR", price: 999, description: "Multi-source individual returns — starting from ₹999" },
      { id: "business", name: "Business ITR", price: 1499, description: "Proprietor / freelancer / presumptive — starting from ₹1,499" },
      { id: "capital_gains", name: "Capital Gains ITR", price: 1999, description: "Shares / MF / property gains — starting from ₹1,999" },
      { id: "complex", name: "Complex ITR", price: 0, description: "F&O, crypto, foreign income — custom quote" },
    ],
    documents: [
      { id: "pan", name: "PAN Card", required: true, ocrType: "pan" },
      { id: "aadhaar", name: "Aadhaar Card", required: true, ocrType: "aadhaar" },
      { id: "form16", name: "Form 16", required: false },
      { id: "ais", name: "AIS", required: false },
      { id: "form26as", name: "Form 26AS", required: false },
      { id: "tis", name: "TIS", required: false },
      { id: "bank_statement", name: "Bank statement", required: true },
      { id: "bank_proof", name: "Cancelled cheque / passbook", required: true },
      { id: "broker_statement", name: "Broker statement", required: false },
      { id: "pl_summary", name: "P&L / sales summary", required: false },
      { id: "other", name: "Other supporting documents", required: false },
    ],
    formSections: [
      {
        id: "itr_profile",
        title: "Filing Profile",
        fields: [
          { name: "assessmentYear", label: "Assessment Year", type: "select", options: ["AY 2026-27 (FY 2025-26)", "AY 2025-26 (FY 2024-25)"], required: true },
          {
            name: "applicantType",
            label: "Applicant type",
            type: "select",
            options: ["Individual", "HUF", "Proprietor", "Other"],
            required: true,
          },
          {
            name: "incomeProfile",
            label: "Income profile",
            type: "select",
            options: ["Salaried", "Pensioner", "Business", "Professional", "Freelancer", "Investor", "Property owner", "Mixed income"],
            required: true,
          },
        ],
      },
      {
        id: "itr_basic",
        title: "ITR Core Details",
        fields: [
          { name: "panNumber", label: "PAN Number", type: "text", required: true, placeholder: "ABCDE1234F", validation: { ruleType: "pan" } },
          { name: "mobile", label: "Mobile", type: "tel", required: true, validation: { ruleType: "phone" } },
        ],
      },
    ],
  },
  {
    slug: "pvc-card",
    categorySlug: "cards",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "2-3 Working Days",
    plans: [
      { id: "standard", name: "Standard PVC Card", price: 0, description: "High quality polymer print with free normal delivery" },
      { id: "premium_pvc", name: "Express PVC Smart Card", price: 0, description: "Extra-thick polymer with speed post shipping (+₹50)" }
    ],
    documents: [
      { id: "card_front", name: "Card Front PDF/Image", required: true, helpHint: "Upload front screenshot or PDF copy" },
      { id: "card_back", name: "Card Back PDF/Image", required: true }
    ],
    formSections: [
      {
        id: "pvc_parameters",
        title: "Card Printing Configuration",
        fields: [
          { name: "cardType", label: "Source Identity Card Type", type: "select", options: ["Aadhaar Card", "PAN Card", "Voter ID Card", "Driving Licence", "Ayushman Card"], required: true },
          { name: "quantity", label: "Print Quantity", type: "select", options: ["1 Smart Card", "2 Copies", "3 Copies", "5 Copies"], required: true },
          { name: "finish", label: "Surface Finish Preference", type: "select", options: ["Glossy Finish", "Matte Finish"], required: true }
        ]
      }
    ]
  },
  {
    slug: "voter-id",
    categorySlug: "cards",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "5-7 Working Days",
    documents: [
      { id: "aadhaar", name: "Aadhaar Card (Birth Proof)", required: true, ocrType: "aadhaar" },
      { id: "photo", name: "Passport Photograph", required: true },
      { id: "address_proof", name: "Local Address Proof", required: true }
    ],
    formSections: [
      {
        id: "voter_action",
        title: "Voter Registration Service",
        fields: [
          { name: "voterService", label: "Request Type", type: "select", options: ["New Voter ID Registration", "Details Modification / Correction", "Duplicate Smart Card Print"], required: true },
          { name: "epicNo", label: "Existing EPIC Number (If Correction/Print)", type: "text", required: false, placeholder: "ABC1234567" }
        ]
      }
    ]
  },
  {
    slug: "eshram-card",
    categorySlug: "cards",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "1-2 Working Days",
    documents: [
      { id: "aadhaar", name: "Aadhaar Card Copy", required: true, ocrType: "aadhaar" },
      { id: "passbook", name: "Bank Passbook Front Page", required: true }
    ],
    formSections: [
      {
        id: "eshram_details",
        title: "Occupation Profiling",
        fields: [
          { name: "primaryOccupation", label: "Primary Work Occupation", type: "text", required: true, placeholder: "e.g. Farmer, Electrician, Painter" },
          { name: "monthlyIncome", label: "Monthly Income Range", type: "select", options: ["Below ₹10,000", "₹10,000 - ₹15,000", "Above ₹15,000"], required: true }
        ]
      },
      {
        id: "bank_autofill",
        title: "Bank Account For Benefits",
        fields: [
          { name: "bankAccount", label: "Account Number", type: "text", required: true, placeholder: "Bank account number", validation: { ruleType: "bank_account" } },
          { name: "ifsc", label: "IFSC Code", type: "text", required: true, placeholder: "IFSC e.g. SBIN0001234", validation: { ruleType: "ifsc" } }
        ]
      }
    ]
  },
  {
    slug: "learning-driving-license",
    categorySlug: "licence",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "5-7 Working Days",
    documents: [
      { id: "aadhaar", name: "Aadhaar Card Copy", required: true, ocrType: "aadhaar" },
      { id: "photo", name: "Passport Photo", required: true },
      { id: "medical_cert", name: "Self Declaration Form 1A", required: true }
    ],
    formSections: [
      {
        id: "dl_rto",
        title: "RTO Details",
        fields: [
          { name: "rtoCity", label: "Preferred RTO City/Office", type: "text", required: true, placeholder: "e.g. Lucknow UP-32" },
          { name: "licenceClass", label: "Class of Vehicle", type: "select", options: ["Motorcycle with Gear (MCWG)", "Light Motor Vehicle (LMV)", "Both MCWG & LMV"], required: true }
        ]
      },
      {
        id: "dl_profile",
        title: "Biological Particulars",
        fields: [
          { name: "bloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], required: true },
          { name: "qualification", label: "Educational Qualification", type: "text", required: true, placeholder: "e.g. Graduate" }
        ]
      }
    ]
  },
  {
    slug: "cm-yuva-entrepreneur-loan-assistance",
    categorySlug: "banking",
    govFee: 0,
    serviceCharge: 0,
    processingTime: "15-20 Working Days",
    documents: [
      { id: "pan", name: "PAN Card Copy", required: true, ocrType: "pan" },
      { id: "aadhaar", name: "Aadhaar Card Copy", required: true, ocrType: "aadhaar" },
      { id: "marksheet", name: "Class 8 or Above Marksheet", required: true },
      { id: "bank_passbook", name: "Bank Passbook/Cancelled Cheque", required: true }
    ],
    formSections: [
      {
        id: "cm_yuva_core",
        title: "Project Parameters",
        fields: [
          { name: "projectCategory", label: "Project Category", type: "select", options: ["Manufacturing", "Service Sector", "Trading Business"], required: true },
          { name: "requestedLoan", label: "Requested Loan Amount", type: "number", required: true, placeholder: "Max ₹5,00,000" }
        ]
      }
    ]
  },
  {
    slug: "detailed-project-report",
    categorySlug: "loans",
    govFee: 0,
    serviceCharge: 399,
    processingTime: "24-72 Working Hours",
    successMessage: "Your DPR application is submitted. Track drafting progress and download from your dashboard when ready.",
    plans: [
      { id: "basic", name: "Basic", price: 399, description: "Bank-ready DPR with standard projections" },
      { id: "professional", name: "Professional", price: 799, description: "Enhanced DPR with machinery schedule" },
      { id: "premium", name: "Premium", price: 1499, description: "Full package with banker checklist" },
      { id: "enterprise", name: "Enterprise", price: 2999, description: "Complex / multi-unit project support" },
    ],
    documents: [
      { id: "pan", name: "PAN Card", required: true, ocrType: "pan" },
      { id: "aadhaar", name: "Aadhaar Card", required: true, ocrType: "aadhaar" },
      { id: "quotation", name: "Machinery / Quotation estimate", required: true },
      { id: "gst", name: "GST Certificate (if registered)", required: false },
      { id: "udyam", name: "Udyam / MSME Certificate", required: false },
      { id: "photo", name: "Passport size photograph", required: true },
      { id: "bank_statement", name: "Recent bank statement", required: true },
      { id: "other", name: "Other supporting documents", required: false },
    ],
    formSections: [
      {
        id: "personal",
        title: "Personal Details",
        fields: [
          { name: "fullName", label: "Full Name", type: "text", required: true },
          { name: "mobile", label: "Mobile Number", type: "tel", required: true, validation: { ruleType: "phone" } },
          { name: "email", label: "Email", type: "email", required: false },
          { name: "pincode", label: "Pincode", type: "text", required: true },
        ],
      },
      {
        id: "business",
        title: "Business Details",
        fields: [
          { name: "businessName", label: "Business / Unit Name", type: "text", required: true },
          {
            name: "businessType",
            label: "Constitution",
            type: "select",
            options: ["Sole Proprietorship", "Partnership", "LLP", "Private Limited", "Other"],
            required: true,
          },
          { name: "businessAddress", label: "Business Address", type: "textarea", required: true },
        ],
      },
      {
        id: "project",
        title: "Project Details",
        fields: [
          {
            name: "scheme",
            label: "Target Scheme",
            type: "select",
            options: ["PMEGP", "Mudra", "CM Yuva", "PM Vishwakarma", "State MSME Scheme", "Other"],
            required: true,
          },
          { name: "projectCost", label: "Total Project Cost (₹)", type: "number", required: true },
          { name: "ownContribution", label: "Own Contribution / Margin (₹)", type: "number", required: true },
          { name: "loanAmount", label: "Loan Amount Required (₹)", type: "number", required: true },
          { name: "expectedSubsidy", label: "Expected Subsidy (₹)", type: "number", required: false },
          { name: "annualSales", label: "Expected Annual Sales (₹)", type: "number", required: true },
          { name: "annualProfit", label: "Expected Annual Profit (₹)", type: "number", required: true },
          { name: "tenureYears", label: "Loan Tenure (Years)", type: "number", required: true },
        ],
      },
    ],
  },
];

// Fallback configuration generator based on category
export function getDynamicServiceConfig(slug: string, categorySlug = "cards"): ServiceConfig {
  const matched = SERVICES_CONFIG_REGISTRY.find((s) => s.slug === slug || (s.slug === `cibil-report-increase` && slug === `cibil-report-analysis-and-credit-health-consultation`));
  if (matched) return matched;

  // Dynamically yield generic category configurations
  const defaultFields: FieldSchema[] = [
    { name: "panNumber", label: "PAN Card Number", type: "text", required: false, validation: { ruleType: "pan" } },
    { name: "aadhaarNumber", label: "Aadhaar Card Number", type: "text", required: false, validation: { ruleType: "aadhaar" } }
  ];

  if (categorySlug === "tax" || categorySlug === "company") {
    defaultFields.push({ name: "businessName", label: "Business Name", type: "text", required: false });
  } else if (categorySlug === "insurance") {
    defaultFields.push(
      { name: "vehicleNumber", label: "Vehicle registration Number", type: "text", required: true },
      { name: "previousPolicy", label: "Previous Policy Details", type: "textarea", required: false }
    );
  } else if (categorySlug === "loans" || categorySlug === "banking") {
    defaultFields.push(
      { name: "monthlyIncome", label: "Monthly Income / Turnover", type: "number", required: true },
      { name: "loanPurpose", label: "Purpose of Loan", type: "textarea", required: false }
    );
  }

  return {
    slug,
    categorySlug,
    govFee: 0,
    serviceCharge: 0,
    processingTime: "5-7 Working Days",
    documents: [
      { id: "aadhaar", name: "Aadhaar Card Copy", required: true, ocrType: "aadhaar" },
      { id: "pan", name: "PAN Card Copy", required: false, ocrType: "pan" }
    ],
    formSections: [
      {
        id: "generic_section",
        title: "Required Particulars",
        fields: defaultFields
      }
    ]
  };
}
