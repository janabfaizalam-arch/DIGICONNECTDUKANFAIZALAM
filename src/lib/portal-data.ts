import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CarFront,
  FileBadge2,
  FileCheck2,
  FileSearch,
  HeartHandshake,
  IdCard,
  Landmark,
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

const baseFields: ServiceField[] = [
  { name: "name", label: "Name", required: true },
  { name: "mobile", label: "Mobile", type: "tel", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "aadhaarNumber", label: "Aadhaar Number" },
  { name: "address", label: "Address", type: "textarea", required: true },
  { name: "state", label: "State", required: true },
  { name: "message", label: "Message", type: "textarea" },
];

const gstFields: ServiceField[] = [
  { name: "name", label: "Name", required: true },
  { name: "mobile", label: "Mobile", type: "tel", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "businessName", label: "Business Name", required: true },
  { name: "businessType", label: "Business Type", required: true },
  { name: "panNumber", label: "PAN Number", required: true },
  { name: "aadhaarNumber", label: "Aadhaar Number", required: true },
  { name: "address", label: "Address", type: "textarea", required: true },
  { name: "state", label: "State", required: true },
  { name: "message", label: "Message", type: "textarea" },
];

export const portalServices: PortalService[] = [
  {
    title: "GST Registration",
    slug: "gst-registration",
    amount: 1499,
    icon: Building2,
    description: "Business GST registration ke liye guided form, document upload aur status tracking.",
    documents: ["PAN Card", "Aadhaar Card", "Business Address Proof", "Bank Details", "Photo"],
    fields: gstFields,
    recommended: ["msme", "trade-license", "food-license"],
  },
  {
    title: "PAN Card",
    slug: "pan-card",
    amount: 299,
    icon: FileCheck2,
    description: "New PAN, correction aur reprint support document guidance ke saath.",
    documents: ["Aadhaar Card", "Photo", "Signature", "Mobile linked with Aadhaar"],
    fields: baseFields,
    recommended: ["gst-registration", "voter-id", "passport"],
  },
  {
    title: "Aadhaar Update",
    slug: "aadhaar-update",
    amount: 199,
    icon: IdCard,
    description: "Aadhaar demographic update aur print support ke liye request submit karein.",
    documents: ["Aadhaar Card", "Address Proof", "DOB Proof"],
    fields: baseFields,
    recommended: ["pan-card", "voter-id", "ration-card"],
  },
  {
    title: "Voter ID",
    slug: "voter-id",
    amount: 249,
    icon: BadgeCheck,
    description: "New voter ID, correction aur address change ke liye application support.",
    documents: ["Photo", "Aadhaar Card", "Address Proof", "Age Proof"],
    fields: baseFields,
    recommended: ["aadhaar-update", "ration-card", "domicile-certificate"],
  },
  {
    title: "Ration Card",
    slug: "ration-card",
    amount: 399,
    icon: WalletCards,
    description: "Ration card apply, member add aur correction ke liye complete support.",
    documents: ["Aadhaar Cards", "Family Photo", "Income Proof", "Address Proof"],
    fields: baseFields,
    recommended: ["income-caste-domicile-certificate", "aadhaar-update", "voter-id"],
  },
  {
    title: "Passport",
    slug: "passport",
    amount: 999,
    icon: ShieldCheck,
    description: "Passport application form filling, appointment guidance aur document checklist.",
    documents: ["Aadhaar Card", "PAN Card", "Address Proof", "DOB Proof", "Photo"],
    fields: baseFields,
    recommended: ["pan-card", "voter-id", "driving-licence"],
  },
  {
    title: "Driving Licence",
    slug: "driving-licence",
    amount: 799,
    icon: CarFront,
    description: "Learner, permanent licence aur renewal support with online application tracking.",
    documents: ["Aadhaar Card", "Address Proof", "Age Proof", "Photo"],
    fields: baseFields,
    recommended: ["passport", "voter-id", "pan-card"],
  },
  {
    title: "MSME",
    slug: "msme",
    amount: 499,
    icon: Landmark,
    description: "Udyam/MSME certificate ke liye business details aur document upload.",
    documents: ["Aadhaar Card", "PAN Card", "Business Details", "Bank Details"],
    fields: gstFields,
    recommended: ["gst-registration", "trade-license", "food-license"],
  },
  {
    title: "Income/Caste/Domicile Certificate",
    slug: "income-caste-domicile-certificate",
    amount: 399,
    icon: FileSearch,
    description: "Income, caste, domicile aur local certificates ke liye application support.",
    documents: ["Aadhaar Card", "Photo", "Address Proof", "Existing Certificate if any"],
    fields: baseFields,
    recommended: ["ration-card", "voter-id", "aadhaar-update"],
  },
  {
    title: "Food License",
    slug: "food-license",
    amount: 1299,
    icon: FileBadge2,
    description: "FSSAI food license registration support for local food businesses.",
    documents: ["PAN Card", "Aadhaar Card", "Business Address Proof", "Photo", "Business Details"],
    fields: gstFields,
    recommended: ["gst-registration", "msme", "trade-license"],
  },
  {
    title: "Trade License",
    slug: "trade-license",
    amount: 1499,
    icon: BriefcaseBusiness,
    description: "Local trade license ke liye document collection aur application support.",
    documents: ["PAN Card", "Aadhaar Card", "Shop Photo", "Address Proof", "Business Details"],
    fields: gstFields,
    recommended: ["gst-registration", "msme", "food-license"],
  },
  {
    title: "Other Government Services",
    slug: "other-government-services",
    amount: 299,
    icon: HeartHandshake,
    description: "Jo service list me nahi hai, uske liye request submit karein. Team guide karegi.",
    documents: ["Relevant Documents", "Aadhaar Card", "Mobile Number"],
    fields: baseFields,
    recommended: ["pan-card", "aadhaar-update", "income-caste-domicile-certificate"],
  },
];

export function getServiceBySlug(slug: string) {
  return portalServices.find((service) => service.slug === slug);
}

export const statusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  documents_pending: "Documents Pending",
  payment_pending: "Payment Pending",
  in_process: "In Process",
  submitted: "Submitted",
  completed: "Completed",
  rejected: "Rejected",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
};

export const upiDetails = {
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "digiconnectdukan@upi",
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
