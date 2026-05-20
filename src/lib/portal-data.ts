import { IdCard } from "lucide-react";

import { getServiceBySlug as getRichServiceBySlug, servicesData } from "@/lib/services-data";

export const applicationStatuses = [
  "payment_pending",
  "draft",
  "payment_success",
  "submitted",
  "documents_required",
  "documents_verified",
  "assigned_to_agent",
  "in_process",
  "in_progress",
  "document_pending",
  "objection",
  "completed",
  "delivered",
  "cancelled",
  "rejected",
  "refunded",
] as const;

export const paymentStatuses = ["unpaid", "pending", "submitted", "verified", "paid", "rejected", "failed", "refunded"] as const;

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

const businessFields: ServiceField[] = [
  { name: "businessName", label: "Business Name", required: false },
  { name: "panNumber", label: "PAN", required: false },
];

const vehicleFields: ServiceField[] = [
  { name: "vehicleNumber", label: "Vehicle Number", required: false },
  { name: "previousPolicy", label: "Previous Policy Details", type: "textarea", required: false },
];

const financeFields: ServiceField[] = [
  { name: "loanPurpose", label: "Loan / Banking Requirement", type: "textarea", required: false },
  { name: "monthlyIncome", label: "Monthly Income / Turnover", required: false },
];

const noExtraFields: ServiceField[] = [];

function getFields(service: (typeof servicesData)[number]): ServiceField[] {
  if (service.categorySlug === "tax-business") {
    return businessFields;
  }

  if (service.categorySlug === "insurance") {
    return vehicleFields;
  }

  if (service.categorySlug === "finance-banking") {
    return financeFields;
  }

  return noExtraFields;
}

function getRecommended(service: (typeof servicesData)[number]) {
  return servicesData
    .filter((item) => item.categorySlug === service.categorySlug && item.slug !== service.slug)
    .slice(0, 3)
    .map((item) => item.slug);
}

export const portalServices: PortalService[] = servicesData.map((service) => ({
  title: service.title,
  slug: service.slug,
  amount: service.amount,
  icon: service.icon,
  description: service.shortDescription,
  documents: service.documents,
  fields: getFields(service),
  recommended: getRecommended(service),
}));

export function getServiceBySlug(slug: string) {
  const richService = getRichServiceBySlug(slug);

  if (!richService) {
    return undefined;
  }

  return portalServices.find((service) => service.slug === richService.slug);
}

export const featuredServiceSlugs = [
  "gst-registration",
  "bike-insurance",
  "pmegp-loan",
  "passport-assistance",
  "mudra-loan",
] as const;

export const featuredServices = featuredServiceSlugs
  .map((slug) => getServiceBySlug(slug))
  .filter((service): service is PortalService => Boolean(service));

export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Draft",
  payment_pending: "Payment Pending",
  payment_success: "Payment Success",
  submitted: "Submitted",
  documents_required: "Documents Required",
  documents_verified: "Documents Verified",
  assigned_to_agent: "Assigned to Agent",
  in_process: "In Progress",
  in_progress: "In Progress",
  document_pending: "Document Pending",
  objection: "Objection",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
  refunded: "Refunded",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  submitted: "Submitted",
  verified: "Paid",
  paid: "Paid",
  rejected: "Rejected",
  failed: "Failed",
  refunded: "Refunded",
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
