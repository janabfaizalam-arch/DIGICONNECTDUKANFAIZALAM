import {
  Building,
  Briefcase,
  Car,
  CreditCard,
  FileCheck,
  FileText,
  HeartHandshake,
  Shield,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * The six steps, in the order a customer walks them.
 *
 * The title and its one line of explanation live here rather than inside each
 * step, because they are rendered by the header above the step — not by the
 * step itself. Having both meant the screen opened with "What do you need?"
 * twice, once in white on the brand field and again in ink underneath it.
 */
export const STEPS = [
  {
    id: 1,
    label: "Services",
    title: "What do you need?",
    description: "Pick one service or several — they go through as one application and one payment.",
  },
  {
    id: 2,
    label: "Details",
    title: "Your details",
    description: "These go on the filing itself, so they need to match your documents.",
  },
  {
    id: 3,
    label: "Documents",
    title: "Your documents",
    description:
      "Add what you have now. Anything missing, our team will ask you for it — this will not hold up your application.",
  },
  {
    id: 4,
    label: "Review",
    title: "Check it over",
    description: "Anything wrong here is much easier to fix now than after filing.",
  },
  {
    id: 5,
    label: "Payment",
    title: "Pay securely",
    description: "Card, UPI, net banking or a wallet — whichever you prefer.",
  },
  {
    id: 6,
    label: "Done",
    title: "That is with us now",
    description: "Our team picks it up from here.",
  },
] as const;

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cards: CreditCard,
  loans: HeartHandshake,
  banking: Building,
  licence: Car,
  tax: FileCheck,
  company: Briefcase,
  insurance: Shield,
};

export const CATEGORIES = [
  { id: "all", name: "All" },
  { id: "tax", name: "Tax & GST" },
  { id: "company", name: "Company" },
  { id: "banking", name: "Banking" },
  { id: "licence", name: "Licences" },
  { id: "loans", name: "Loans" },
  { id: "insurance", name: "Insurance" },
  { id: "cards", name: "Cards" },
] as const;

export const DOC_SLOTS = [
  { id: "aadhaar", label: "Aadhaar Card", hint: "Front and back. JPG or PDF.", icon: UserCheck },
  { id: "pan", label: "PAN Card", hint: "A clear photo of the card.", icon: CreditCard },
  { id: "other", label: "Other Document", hint: "Anything else that supports this filing.", icon: FileText },
] as const;

export type DocSlotId = "aadhaar" | "pan" | "other";

export interface CustomerForm {
  name: string;
  mobile: string;
  altMobile: string;
  pincode: string;
  state: string;
  district: string;
  address: string;
  note: string;
}

export interface CartEntry {
  slug: string;
  quantity: number;
}

export interface CartItem {
  service: import("@/lib/agent-services").AgentService;
  quantity: number;
}

export interface SuccessDetails {
  applicationIds: string[];
  customerName: string;
  serviceTitle: string;
  amountPaid: number;
}

export type PaymentStage =
  | "ORDER_CREATE"
  | "RAZORPAY_OPEN"
  | "PAYMENT_DONE"
  | "VERIFY"
  | "FINALIZE";

/**
 * Payment breadcrumbs.
 *
 * Every stage of the Razorpay handshake logs, because when a payment goes
 * wrong the only thing that helps is knowing exactly how far it got.
 */
export function payLog(stage: PaymentStage, detail: Record<string, unknown>) {
  console.info(`[PAY:${stage}]`, detail);
}

/** Rupees, the way a customer writes them. */
export function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
