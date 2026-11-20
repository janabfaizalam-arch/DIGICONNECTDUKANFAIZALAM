// ============================================================================
// DC Partner home — quick actions & overview config (source of truth)
// ============================================================================

import type { DigiPartnerType } from "@/lib/ap/partner-type";
import type { PartnerQuickAction } from "@/lib/ap/home-types";

/** Shared operational actions for Business Partner and Field Executive. */
export const STANDARD_PARTNER_ACTIONS: PartnerQuickAction[] = [
  {
    key: "new-customer",
    label: "New Customer",
    description: "Start a new customer journey",
    href: "/dc-partner/customers/new",
    iconName: "UserPlus",
  },
  {
    key: "apply-service",
    label: "Apply Service",
    description: "Submit a new application",
    href: "/dc-partner/applications/new",
    iconName: "FilePlus2",
  },
  {
    key: "my-applications",
    label: "My Applications",
    description: "Track your submissions",
    href: "/dc-partner/applications",
    iconName: "Files",
  },
  {
    key: "upload-documents",
    label: "Upload Documents",
    description: "Attach missing files",
    href: "/dc-partner/applications",
    iconName: "UploadCloud",
  },
  {
    key: "collect-payment",
    label: "Collect Payment",
    description: "Create a payment link",
    href: "/dc-partner/payments/collect",
    iconName: "IndianRupee",
  },
  {
    key: "view-commission",
    label: "View Commission",
    description: "Earnings ledger",
    href: "/dc-partner/commissions",
    iconName: "BadgeIndianRupee",
  },
];

export const OFFICE_STAFF_ACTIONS: PartnerQuickAction[] = [
  {
    key: "search-customer",
    label: "Search Customer",
    description: "Find a customer record",
    href: "/dc-partner/customers",
    iconName: "Search",
  },
  {
    key: "process-application",
    label: "Process Application",
    description: "Work the processing queue",
    href: "/dc-partner/assigned-work",
    iconName: "ClipboardCheck",
  },
  {
    key: "offline-invoice",
    label: "Offline Invoice",
    description: "Manual invoice tools",
    href: "/dc-partner/invoices/offline",
    iconName: "ReceiptText",
  },
  {
    key: "support-queue",
    label: "Support Queue",
    description: "Partner support desk",
    href: "/dc-partner/support",
    iconName: "Headphones",
  },
  {
    key: "collect-payment",
    label: "Collect Payment",
    description: "Create a payment link",
    href: "/dc-partner/payments/collect",
    iconName: "IndianRupee",
  },
  {
    key: "view-commission",
    label: "View Commission",
    description: "Commission or bonus",
    href: "/dc-partner/commissions",
    iconName: "BadgeIndianRupee",
  },
];

export const PARTNER_HOME_ACTIONS = {
  business_partner: STANDARD_PARTNER_ACTIONS,
  field_executive: STANDARD_PARTNER_ACTIONS,
  company_partner: STANDARD_PARTNER_ACTIONS,
  office_staff: OFFICE_STAFF_ACTIONS,
} satisfies Record<DigiPartnerType, PartnerQuickAction[]>;

export function getPartnerHomeActions(partnerType: DigiPartnerType): PartnerQuickAction[] {
  return PARTNER_HOME_ACTIONS[partnerType];
}
