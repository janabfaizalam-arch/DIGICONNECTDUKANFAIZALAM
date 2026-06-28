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
    govFee: 1500,
    serviceCharge: 999,
    processingTime: "7-10 Working Days",
    successMessage: "Passport online file submitted. Our coordinator will contact you via WhatsApp with appointment slot options.",
    plans: [
      { id: "normal", name: "Normal Processing", price: 2499, description: "Standard passport file creation and RPO scheduling" },
      { id: "tatkal", name: "Tatkal Speed Processing", price: 3999, description: "Fast track Tatkal file submission and urgent slots" }
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
    serviceCharge: 2499,
    processingTime: "3-5 Working Days",
    successMessage: "GST registration dossier sent to GSTN processor. Check updates in dashboard.",
    plans: [
      { id: "basic", name: "Basic Registration", price: 2499, description: "Standard business registration & ARN generation" },
      { id: "msme", name: "GST + MSME Bundle", price: 2999, description: "GSTIN registration plus Udyam Certificate" },
      { id: "starter", name: "Business Starter Pack", price: 3999, description: "GST, MSME, Business consultations and GST compliance checklist" }
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
    serviceCharge: 699,
    processingTime: "2-3 Working Days",
    plans: [
      { id: "itr1", name: "ITR-1 Salaried", price: 699, description: "Filing for Single salary, pension or interest income" },
      { id: "itr2", name: "ITR-2 Capital Gains", price: 999, description: "Filing for Share market gains or multiple house properties" },
      { id: "itr3", name: "ITR-3 Business/Professional", price: 1499, description: "Filing for business logs, CA audits, or freelancers" }
    ],
    documents: [
      { id: "form16", name: "Form 16 / AIS Summary", required: true },
      { id: "pan", name: "PAN Card Copy", required: true, ocrType: "pan" },
      { id: "bank_statement", name: "Bank Statement (Last 12 Months)", required: true }
    ],
    formSections: [
      {
        id: "itr_basic",
        title: "ITR Core Details",
        fields: [
          { name: "panNumber", label: "PAN Number", type: "text", required: true, placeholder: "ABCDE1234F", validation: { ruleType: "pan" } },
          { name: "assessmentYear", label: "Assessment Year", type: "select", options: ["AY 2026-27 (FY 2025-26)", "AY 2025-26 (FY 2024-25)"], required: true }
        ]
      },
      {
        id: "income_source",
        title: "Income Categories",
        fields: [
          { name: "salaryIncome", label: "Salary Income", type: "select", options: ["No", "Yes"], required: true },
          { name: "businessIncome", label: "Business/Professional Income", type: "select", options: ["No", "Yes"], required: true },
          { name: "capitalGains", label: "Capital Gains (Shares/Property)", type: "select", options: ["No", "Yes"], required: true }
        ]
      }
    ]
  },
  {
    slug: "pvc-card",
    categorySlug: "cards",
    govFee: 49,
    serviceCharge: 100,
    processingTime: "2-3 Working Days",
    plans: [
      { id: "standard", name: "Standard PVC Card", price: 149, description: "High quality polymer print with free normal delivery" },
      { id: "premium_pvc", name: "Express PVC Smart Card", price: 199, description: "Extra-thick polymer with speed post shipping (+₹50)" }
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
    serviceCharge: 99,
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
    serviceCharge: 149,
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
    govFee: 450,
    serviceCharge: 1049,
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
    serviceCharge: 13499,
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
  }
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
    serviceCharge: 499,
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
