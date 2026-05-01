import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ClipboardCheck,
  FileBadge2,
  FileCheck2,
  FileHeart,
  FileSearch,
  HeartHandshake,
  HeartPulse,
  IdCard,
  Landmark,
  Tractor,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

export const applicationStatuses = [
  "new",
  "documents_pending",
  "payment_pending",
  "in_process",
  "submitted",
  "completed",
  "rejected",
] as const;

export const paymentStatuses = ["pending", "verified", "failed"] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export type ServiceField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
};

export type PortalService = {
  title: string;
  slug: string;
  amount: number;
  icon: typeof IdCard;
  description: string;
  documents: string[];
  fields: ServiceField[];
  recommended: string[];
};

export const featuredServiceSlugs = [
  "pan-card",
  "aadhaar-update",
  "voter-id",
  "passport-assistance",
  "driving-licence",
  "gst-registration",
] as const;

const gstFields: ServiceField[] = [
  { name: "businessName", label: "Business Name", required: true },
  { name: "panNumber", label: "PAN", required: true },
];

const panFields: ServiceField[] = [
  { name: "fullName", label: "Full Name", required: true },
  { name: "fatherName", label: "Father's Name", required: true },
];

const aadhaarFields: ServiceField[] = [
  { name: "aadhaarNumber", label: "Aadhaar Number", required: true },
];

const noExtraFields: ServiceField[] = [];

export const portalServices: PortalService[] = [
  {
    title: "GST Registration & Filing",
    slug: "gst-registration",
    amount: 499,
    icon: Building2,
    description: "Guided GST registration, document upload, and status tracking for businesses.",
    documents: ["PAN Card", "Aadhaar Card", "Business Address Proof", "Bank Details", "Photo"],
    fields: gstFields,
    recommended: ["msme", "trade-license", "food-license"],
  },
  {
    title: "PAN Card",
    slug: "pan-card",
    amount: 199,
    icon: FileCheck2,
    description: "Support for new PAN applications, corrections, and reprints with document guidance.",
    documents: ["Aadhaar Card", "Photo", "Signature", "Mobile linked with Aadhaar"],
    fields: panFields,
    recommended: ["gst-registration", "voter-id", "passport-assistance"],
  },
  {
    title: "Aadhaar Update",
    slug: "aadhaar-update",
    amount: 99,
    icon: IdCard,
    description: "Submit requests for Aadhaar demographic updates and print support.",
    documents: ["Aadhaar Card", "Address Proof", "DOB Proof"],
    fields: aadhaarFields,
    recommended: ["pan-card", "voter-id", "ration-card"],
  },
  {
    title: "Voter ID",
    slug: "voter-id",
    amount: 249,
    icon: BadgeCheck,
    description: "Application support for new voter ID, corrections, and address changes.",
    documents: ["Photo", "Aadhaar Card", "Address Proof", "Age Proof"],
    fields: noExtraFields,
    recommended: ["aadhaar-update", "ration-card", "domicile-certificate"],
  },
  {
    title: "Ration Card",
    slug: "ration-card",
    amount: 399,
    icon: WalletCards,
    description: "Complete support for ration card applications, member additions, and corrections.",
    documents: ["Aadhaar Cards", "Family Photo", "Income Proof", "Address Proof"],
    fields: noExtraFields,
    recommended: ["income-caste-domicile-certificate", "aadhaar-update", "voter-id"],
  },
  {
    title: "Labour Card / e-Shram Card",
    slug: "labour-card-e-shram-card",
    amount: 199,
    icon: ClipboardCheck,
    description: "Simple application support for Labour Card and e-Shram Card registration.",
    documents: ["Aadhaar Card", "Mobile Number", "Bank Details", "Photo"],
    fields: noExtraFields,
    recommended: ["ayushman-card", "pm-kisan-pension-schemes", "ration-card"],
  },
  {
    title: "Ayushman Card",
    slug: "ayushman-card",
    amount: 199,
    icon: HeartPulse,
    description: "Ayushman Bharat card eligibility checks, application support, and print assistance.",
    documents: ["Aadhaar Card", "Ration Card", "Mobile Number"],
    fields: noExtraFields,
    recommended: ["ration-card", "aadhaar-update", "labour-card-e-shram-card"],
  },
  {
    title: "Passport Assistance",
    slug: "passport-assistance",
    amount: 999,
    icon: ShieldCheck,
    description: "Passport form filling, appointment guidance, and document checklist support.",
    documents: ["Aadhaar Card", "PAN Card", "Address Proof", "DOB Proof", "Photo"],
    fields: noExtraFields,
    recommended: ["pan-card", "voter-id", "driving-licence"],
  },
  {
    title: "Driving Licence",
    slug: "driving-licence",
    amount: 799,
    icon: CarFront,
    description: "Learner, permanent licence, and renewal support with online application tracking.",
    documents: ["Aadhaar Card", "Address Proof", "Age Proof", "Photo"],
    fields: noExtraFields,
    recommended: ["passport-assistance", "voter-id", "pan-card"],
  },
  {
    title: "Birth & Death Certificate",
    slug: "birth-death-certificate",
    amount: 299,
    icon: FileHeart,
    description: "Document guidance for birth and death certificate applications or corrections.",
    documents: ["Aadhaar Card", "Hospital/Supporting Proof", "Address Proof", "Mobile Number"],
    fields: noExtraFields,
    recommended: ["aadhaar-update", "income-caste-domicile-certificate", "ration-card"],
  },
  {
    title: "MSME Certificate",
    slug: "msme",
    amount: 499,
    icon: Landmark,
    description: "Business detail and document upload support for Udyam/MSME certificates.",
    documents: ["Aadhaar Card", "PAN Card", "Business Details", "Bank Details"],
    fields: gstFields,
    recommended: ["gst-registration", "trade-license", "food-license"],
  },
  {
    title: "PM Kisan / Pension Schemes",
    slug: "pm-kisan-pension-schemes",
    amount: 199,
    icon: Tractor,
    description: "Online assistance for PM Kisan, pension, and welfare scheme forms.",
    documents: ["Aadhaar Card", "Bank Details", "Land/Eligibility Proof", "Mobile Number"],
    fields: noExtraFields,
    recommended: ["income-caste-domicile-certificate", "ration-card", "ayushman-card"],
  },
  {
    title: "Income/Caste/Domicile Certificate",
    slug: "income-caste-domicile-certificate",
    amount: 399,
    icon: FileSearch,
    description: "Application support for income, caste, domicile, and other certificates.",
    documents: ["Aadhaar Card", "Photo", "Address Proof", "Existing Certificate if any"],
    fields: noExtraFields,
    recommended: ["ration-card", "voter-id", "aadhaar-update"],
  },
  {
    title: "Food License",
    slug: "food-license",
    amount: 1299,
    icon: FileBadge2,
    description: "FSSAI food license registration support for food businesses across India.",
    documents: ["PAN Card", "Aadhaar Card", "Business Address Proof", "Photo", "Business Details"],
    fields: gstFields,
    recommended: ["gst-registration", "msme", "trade-license"],
  },
  {
    title: "Trade License / Shop Act",
    slug: "trade-license",
    amount: 1499,
    icon: BriefcaseBusiness,
    description: "Document collection and application support for trade license and Shop Act services.",
    documents: ["PAN Card", "Aadhaar Card", "Shop Photo", "Address Proof", "Business Details"],
    fields: gstFields,
    recommended: ["gst-registration", "msme", "food-license"],
  },
  {
    title: "Other Government Services",
    slug: "other-government-services",
    amount: 299,
    icon: HeartHandshake,
    description: "Submit a request for services not listed here and our team will guide you.",
    documents: ["Relevant Documents", "Aadhaar Card", "Mobile Number"],
    fields: noExtraFields,
    recommended: ["pan-card", "aadhaar-update", "income-caste-domicile-certificate"],
  },
];

export function getServiceBySlug(slug: string) {
  if (slug === "passport") {
    return portalServices.find((service) => service.slug === "passport-assistance");
  }

  return portalServices.find((service) => service.slug === slug);
}

export const featuredServices = featuredServiceSlugs
  .map((slug) => getServiceBySlug(slug))
  .filter((service): service is PortalService => Boolean(service));

export const statusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  documents_pending: "In Progress",
  payment_pending: "In Progress",
  in_process: "In Progress",
  submitted: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
};

export const upiDetails = {
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "7007595931@upi",
  payeeName: "DigiConnect Dukan",
  qrImageUrl: process.env.NEXT_PUBLIC_UPI_QR_URL ?? "",
};

export function createInvoiceNumber(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `DCD-${stamp}-${suffix}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
