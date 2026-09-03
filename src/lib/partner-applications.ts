/**
 * Digi Partner signup application — shape, validation and lifecycle, with no
 * I/O so it can be tested directly.
 *
 * An application is not a partner. Nothing here grants access: approving a row
 * is what provisions the auth user and the `agency_partners` record, and until
 * that happens the applicant cannot log in, sell, or earn. Keeping that
 * boundary explicit is the point of the separate table.
 */

import { isPublicApplicationPartnerType } from "@/lib/ap/partner-type";
import type { DigiPartnerType } from "@/lib/ap/partner-type";

export const PARTNER_APPLICATION_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
] as const;

export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

export function isPartnerApplicationStatus(value: unknown): value is PartnerApplicationStatus {
  return typeof value === "string" && (PARTNER_APPLICATION_STATUSES as readonly string[]).includes(value);
}

/**
 * Where a review can go next.
 *
 * `approved` is terminal because approving provisions a live partner account —
 * re-approving would try to provision a second one, and "un-approving" would
 * leave a working login behind a rejected application. `rejected` is terminal
 * so a decision cannot be quietly reversed; the applicant re-applies instead.
 */
const ALLOWED_TRANSITIONS: Record<PartnerApplicationStatus, PartnerApplicationStatus[]> = {
  pending: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export function allowedApplicationTransitions(from: PartnerApplicationStatus): PartnerApplicationStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export function canTransitionApplication(
  from: PartnerApplicationStatus,
  to: PartnerApplicationStatus,
): boolean {
  return allowedApplicationTransitions(from).includes(to);
}

/** Statuses that still occupy the "one open application per mobile" slot. */
export function isOpenApplicationStatus(status: PartnerApplicationStatus): boolean {
  return status === "pending" || status === "under_review";
}

export const PARTNER_APPLICATION_STATUS_LABELS: Record<PartnerApplicationStatus, string> = {
  pending: "Pending review",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Not approved",
};

export type PartnerApplicationInput = {
  fullName: string;
  businessName: string | null;
  partnerType: DigiPartnerType;
  mobile: string;
  whatsapp: string | null;
  /**
   * Optional, and not a credential.
   *
   * The form used to demand this and promise it would be the partner login.
   * The login is a username; see provisionPartnerAccount. A shop owner with a
   * WhatsApp number and no working email was being turned away at the first
   * screen for a field nothing depended on.
   */
  email: string | null;
  address: string | null;
  state: string | null;
  district: string | null;
  pin: string | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  gstin: string | null;
  referralSource: string | null;
  about: string | null;
};

export type ValidationResult =
  | { ok: true; value: PartnerApplicationInput }
  | { ok: false; error: string; field: string };

function trimmedOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

/** Indian mobile numbers are stored as the last 10 digits everywhere else. */
export function normalizeMobile(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

export function isValidMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(value);
}

/**
 * A tracking code the applicant can quote to check progress.
 *
 * Deliberately unguessable rather than sequential: the status lookup takes
 * this code alone, so a predictable one would let anyone enumerate other
 * people's applications.
 */
export function generateTrackingCode(randomBytes: () => string = defaultRandom): string {
  return `DPA-${randomBytes().toUpperCase()}`;
}

function defaultRandom(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate and normalise a public signup submission.
 *
 * Everything optional here is genuinely optional — an applicant filling this
 * on a phone should not be blocked on a GSTIN they may not have. Only what an
 * admin needs to contact and identify them is required.
 */
export function validatePartnerApplication(raw: unknown): ValidationResult {
  const body = (raw ?? {}) as Record<string, unknown>;

  const fullName = String(body.fullName ?? "").trim();
  if (fullName.length < 3) {
    return { ok: false, error: "Enter your full name.", field: "fullName" };
  }
  if (fullName.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer.", field: "fullName" };
  }

  const mobile = normalizeMobile(body.mobile);
  if (!isValidMobile(mobile)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number.", field: "mobile" };
  }

  const emailRaw = trimmedOrNull(body.email);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  // Optional — but a typo in one that was offered is still worth catching.
  if (email && !isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address, or leave it blank.", field: "email" };
  }

  /*
    Only the two types a stranger may claim.

    All four exist in the system, but Company Partner is a commercial
    arrangement and Office Staff is an employee — both are created by an admin
    or from /ap/team. Accepting them here would let anyone register themselves
    as a strategic partner of the company by editing one field in the request.
  */
  const partnerTypeRaw = String(body.partnerType ?? "business_partner");
  if (!isPublicApplicationPartnerType(partnerTypeRaw)) {
    return { ok: false, error: "Choose how you want to partner with us.", field: "partnerType" };
  }
  const partnerType = partnerTypeRaw as DigiPartnerType;

  /*
    A shop needs a name; a person walking the field does not have one.

    Requiring it of everybody would make a Field Executive invent a shop, and
    requiring it of nobody loses the one thing that identifies a Business
    Partner in a list of two hundred.
  */
  const businessName = trimmedOrNull(body.businessName);
  if (partnerType === "business_partner" && !businessName) {
    return { ok: false, error: "Enter your shop or business name.", field: "businessName" };
  }
  if (businessName && businessName.length > 160) {
    return { ok: false, error: "Business name must be 160 characters or fewer.", field: "businessName" };
  }

  const whatsappRaw = trimmedOrNull(body.whatsapp);
  const whatsapp = whatsappRaw ? normalizeMobile(whatsappRaw) : null;
  if (whatsapp && !isValidMobile(whatsapp)) {
    return { ok: false, error: "Enter a valid 10-digit WhatsApp number.", field: "whatsapp" };
  }

  const pinRaw = trimmedOrNull(body.pin);
  const pin = pinRaw ? pinRaw.replace(/\D/g, "").slice(0, 6) : null;
  if (pin && pin.length !== 6) {
    return { ok: false, error: "PIN code must be 6 digits.", field: "pin" };
  }

  const aadhaarRaw = trimmedOrNull(body.aadhaarNumber);
  const aadhaarNumber = aadhaarRaw ? aadhaarRaw.replace(/\D/g, "").slice(0, 12) : null;
  if (aadhaarNumber && aadhaarNumber.length !== 12) {
    return { ok: false, error: "Aadhaar number must be 12 digits.", field: "aadhaarNumber" };
  }

  const panRaw = trimmedOrNull(body.panNumber);
  const panNumber = panRaw ? panRaw.toUpperCase() : null;
  if (panNumber && !isValidPan(panNumber)) {
    return { ok: false, error: "Enter a valid PAN, e.g. ABCDE1234F.", field: "panNumber" };
  }

  const about = trimmedOrNull(body.about);
  if (about && about.length > 1000) {
    return { ok: false, error: "Keep the description under 1000 characters.", field: "about" };
  }

  return {
    ok: true,
    value: {
      fullName,
      businessName,
      partnerType,
      mobile,
      whatsapp,
      email,
      address: trimmedOrNull(body.address),
      state: trimmedOrNull(body.state),
      district: trimmedOrNull(body.district),
      pin,
      aadhaarNumber,
      panNumber,
      gstin: trimmedOrNull(body.gstin)?.toUpperCase() ?? null,
      referralSource: trimmedOrNull(body.referralSource),
      about,
    },
  };
}

/** Map a validated application onto the table's column names. */
export function toApplicationRow(
  input: PartnerApplicationInput,
  trackingCode: string,
): Record<string, unknown> {
  return {
    full_name: input.fullName,
    business_name: input.businessName,
    partner_type: input.partnerType,
    mobile: input.mobile,
    whatsapp: input.whatsapp,
    email: input.email,
    address: input.address,
    state: input.state,
    district: input.district,
    pin: input.pin,
    aadhaar_number: input.aadhaarNumber,
    pan_number: input.panNumber,
    gstin: input.gstin,
    referral_source: input.referralSource,
    about: input.about,
    status: "pending",
    tracking_code: trackingCode,
  };
}

/**
 * A temporary password for a newly approved partner.
 *
 * Shown to the reviewing admin once so they can pass it on, and never stored
 * by us — Supabase owns the credential from the moment it is set.
 */
export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
