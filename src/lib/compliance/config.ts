/**
 * One place for everything the legal pages, the footer and the cookie banner
 * say about who we are, who we share data with, and what the site stores.
 *
 * Rules for editing this file:
 *   • Only facts the business has confirmed. A value we do not have is `null`
 *     and renders as "to be published" — never a plausible-looking guess.
 *   • No secrets. Analytics IDs are read from NEXT_PUBLIC_ env vars, which are
 *     public by design; nothing server-only belongs here.
 *   • When a processor, cookie or retention period changes, change it here and
 *     bump `LEGAL_LAST_UPDATED` (and `CONSENT_VERSION` if the cookie categories
 *     change, so returning visitors are asked again).
 */

import { contactDetails } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";

/** Shown at the top of every policy page. Update whenever a policy changes. */
export const LEGAL_LAST_UPDATED = "25 September 2026";

/**
 * Bump when cookie categories or the trackers inside them change. A stored
 * choice made under an older version is treated as "not yet decided", so the
 * visitor sees the banner again instead of being held to a choice they made
 * about a different set of trackers.
 */
export const CONSENT_VERSION = 1;

export const business = {
  brand: "DigiConnect Dukan",
  tagline: "Connecting People, Empowering Digital India",
  legalEntity: "RNOS India Private Limited",
  poweredBy: "RNoS India Pvt. Ltd.",
  location: "Orai, Jalaun, Uttar Pradesh, India",
  country: "India",
  siteUrl: getSiteUrl(),
  email: contactDetails.email,
  phone: contactDetails.primaryPhone,
  officeSupportPhone: contactDetails.officeSupportPhone,
  whatsapp: contactDetails.primaryPhone,
  /** As already published in the site footer. */
  supportHours: "Monday to Saturday, 10:00 AM – 6:00 PM IST",

  /*
    TODO(business): the following have not been provided and are deliberately
    left empty. Fill them in only from official records.
  */
  /** Full registered office address as per MCA records. */
  registeredOfficeAddress: null as string | null,
  /** Corporate Identification Number. */
  cin: null as string | null,
  /** GSTIN — only if the business wants it published. */
  gstin: null as string | null,
} as const;

/**
 * Privacy / grievance contact.
 *
 * TODO(business/legal): appoint and name a Grievance Officer (and a dedicated
 * privacy mailbox if desired). Until then requests go to the support inbox.
 */
export const privacyContact = {
  grievanceOfficerName: null as string | null,
  email: contactDetails.email,
  phone: contactDetails.primaryPhone,
  /** Target acknowledgement time we commit to publicly. */
  acknowledgeWithin: "7 days",
} as const;

export const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Refund & Cancellation", href: "/refund-policy" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Contact & Grievance", href: "/contact" },
] as const;

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type CookieCategoryInfo = {
  id: ConsentCategory;
  label: string;
  description: string;
  /** Necessary storage cannot be switched off. */
  required: boolean;
  items: { name: string; provider: string; purpose: string; duration: string }[];
};

/**
 * What the site stores in the browser, grouped by why.
 *
 * Kept in step with the code: every tracker listed under analytics or
 * marketing is loaded only after the matching consent (see
 * `components/privacy/tracking-scripts.tsx`).
 */
export const cookieCategories: CookieCategoryInfo[] = [
  {
    id: "necessary",
    label: "Strictly necessary",
    description:
      "Needed for sign-in, security, payments and remembering your cookie choice. The site cannot work properly without these, so they cannot be switched off.",
    required: true,
    items: [
      {
        name: "sb-* (Supabase auth)",
        provider: "DigiConnect Dukan (via Supabase)",
        purpose: "Keeps you signed in to your account.",
        duration: "Session / until sign-out",
      },
      {
        name: "Customer session cookies (access, refresh, device id)",
        provider: "DigiConnect Dukan",
        purpose:
          "Keep customers signed in after WhatsApp OTP / PIN verification and let you see and revoke signed-in devices. HTTP-only — not readable by page scripts.",
        duration: "Until expiry or sign-out",
      },
      {
        name: "dcd_referral",
        provider: "DigiConnect Dukan",
        purpose: "Remembers the partner referral link you arrived from so the right partner is credited.",
        duration: "30 days",
      },
      {
        name: "dc_consent",
        provider: "DigiConnect Dukan",
        purpose: "Remembers your cookie choices.",
        duration: "6 months",
      },
      {
        name: "Razorpay checkout",
        provider: "Razorpay",
        purpose: "Processes payments securely when you choose to pay online.",
        duration: "Set by Razorpay during checkout",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    description:
      "Help us understand which pages are used so we can improve the site. Google Analytics is loaded only if you allow this category.",
    required: false,
    items: [
      {
        name: "_ga, _ga_*",
        provider: "Google Analytics (Google LLC)",
        purpose: "Counts visits and page views; records aggregate usage.",
        duration: "Up to 2 years",
      },
      {
        name: "dc_visit_session (session storage)",
        provider: "DigiConnect Dukan",
        purpose:
          "First-party page-view counter. Stores a random tab id; no cookie, no IP address stored, visitor id is a hash that changes daily.",
        duration: "Until the tab is closed",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    description:
      "Measure the effectiveness of our adverts on Facebook and Instagram. The Meta Pixel is loaded only if you allow this category.",
    required: false,
    items: [
      {
        name: "_fbp, _fbc",
        provider: "Meta Platforms (Meta Pixel)",
        purpose: "Ad measurement and audience building for Facebook / Instagram adverts.",
        duration: "Up to 90 days",
      },
    ],
  },
];

export type ProcessorInfo = {
  name: string;
  purpose: string;
  data: string;
};

/**
 * Service providers that receive personal data from us, as found in the
 * codebase. Transfers may be outside India depending on each provider's
 * infrastructure — see the Privacy Policy.
 *
 * TODO(legal): confirm each provider's data-processing terms and hosting
 * region, and that this list is complete for any tool used outside this code.
 */
export const processors: ProcessorInfo[] = [
  { name: "Supabase", purpose: "Database, authentication and document storage", data: "Account, application, payment-record and uploaded-document data" },
  { name: "Vercel", purpose: "Website hosting and delivery", data: "Request data such as IP address, device/browser information, approximate location" },
  { name: "Razorpay", purpose: "Online payment processing", data: "Payment details you enter at checkout, order amount, contact details" },
  { name: "AiSensy (WhatsApp Business messaging)", purpose: "OTP and application-status messages on WhatsApp", data: "Mobile number, name, message content about your application" },
  { name: "Google (Workspace / Sheets)", purpose: "Internal office CRM records", data: "Lead and application details handled by our team" },
  { name: "Google (Gemini API)", purpose: "Optional AI photo editing, only when you use that tool", data: "The photo you upload for editing" },
  { name: "Credit bureau data provider (via Unifers)", purpose: "Credit report service, only when you request it", data: "Name, mobile, PAN, date of birth and consent for the credit check" },
  { name: "Google (Sign-in) / Meta (Facebook Login)", purpose: "Optional social sign-in", data: "Name, email and profile identifier from your Google/Facebook account" },
  { name: "Google Analytics", purpose: "Website analytics — only with your consent", data: "Pseudonymous usage and device data" },
  { name: "Meta Pixel", purpose: "Advert measurement — only with your consent", data: "Pseudonymous usage and device data, page events" },
];

/**
 * Retention periods.
 *
 * TODO(legal/business): these are the periods the business must confirm and
 * then actually enforce. Only `printFiles` is enforced in code today (the
 * cleanup-prints cron); everything else is a stated policy, not automation.
 */
export const retention = [
  { data: "Account profile", period: "While your account is active, and deleted or anonymised after closure unless the law requires us to keep it." },
  { data: "Service applications and uploaded documents", period: "For as long as needed to complete the service and handle follow-ups or disputes, then deleted, unless a longer period is required by law." },
  { data: "Payment and invoice records", period: "As long as required under applicable tax and accounting laws (commonly up to 8 years)." },
  { data: "Enquiries / leads", period: "Until the enquiry is closed plus a reasonable follow-up period." },
  { data: "Smart Print files", period: "Removed automatically by a scheduled clean-up job after the print job is complete." },
  { data: "OTP records", period: "OTPs are stored only as one-way hashes and expire within minutes." },
  { data: "Website visit statistics", period: "Stored without IP addresses; kept in aggregate for reporting." },
];
