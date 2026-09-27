import { randomInt } from "crypto";
import { z } from "zod";

/**
 * Privacy / data-rights requests.
 *
 * The public form records a request; nothing about the requester's data
 * changes until staff have verified who is asking (normally by calling or
 * messaging the registered mobile) and decided what the law requires.
 */

export const PRIVACY_REQUEST_TYPES = ["access", "correction", "erasure", "withdraw", "nominate", "grievance"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_TYPE_LABELS: Record<PrivacyRequestType, string> = {
  access: "Summary of my data",
  correction: "Correct / update my data",
  erasure: "Delete my data / close account",
  withdraw: "Withdraw consent",
  nominate: "Nominate someone",
  grievance: "Privacy complaint",
};

export const PRIVACY_REQUEST_STATUSES = ["pending", "verification_required", "in_review", "completed", "rejected"] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REQUEST_STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  pending: "New",
  verification_required: "Verifying identity",
  in_review: "In review",
  completed: "Completed",
  rejected: "Rejected",
};

export const VERIFICATION_STATUSES = ["unverified", "verified", "failed"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

const TRANSITIONS: Record<PrivacyRequestStatus, PrivacyRequestStatus[]> = {
  pending: ["verification_required", "in_review", "rejected"],
  verification_required: ["in_review", "rejected"],
  in_review: ["verification_required", "completed", "rejected"],
  completed: [],
  rejected: [],
};

export function allowedPrivacyTransitions(from: PrivacyRequestStatus): PrivacyRequestStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionPrivacyRequest(from: PrivacyRequestStatus, to: PrivacyRequestStatus) {
  return allowedPrivacyTransitions(from).includes(to);
}

/**
 * Whether a request may be closed as completed. Anything that acts on a
 * person's data needs their identity confirmed first.
 */
export function completionBlocker(request: { status: PrivacyRequestStatus; verification_status: VerificationStatus }) {
  if (request.verification_status !== "verified") {
    return "Verify the requester's identity before completing the request.";
  }
  return null;
}

const mobile = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .transform((digits) => (digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter the 10-digit mobile number registered with us."));

export const privacyRequestInputSchema = z.object({
  requestType: z.enum(PRIVACY_REQUEST_TYPES),
  name: z.string().trim().min(1, "Enter your name.").max(120),
  mobile,
  details: z
    .string()
    .trim()
    .max(800)
    .optional()
    .transform((value) => value || null),
});

export type PrivacyRequestInput = z.infer<typeof privacyRequestInputSchema>;

export const privacyRequestUpdateSchema = z
  .object({
    status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
    verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
    notes: z.string().trim().max(1000).optional(),
    assignToMe: z.boolean().optional(),
  })
  .refine((value) => value.status || value.verificationStatus || value.notes || value.assignToMe, {
    message: "Nothing to update.",
  });

/** Aadhaar (12 digits) or PAN in free text is data we asked people not to send. */
export function redactIdentifiers(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[number removed]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "[PAN removed]");
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. PR-7KX4M2QD — unambiguous characters, not guessable in sequence. */
export function newPrivacyReference() {
  let code = "";
  for (let i = 0; i < 8; i += 1) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `PR-${code}`;
}
