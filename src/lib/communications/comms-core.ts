/** Pure communication helpers (unit-testable). */

export const COMMUNICATION_CHANNELS = ["whatsapp", "internal_alert"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_CLASSIFICATIONS = ["transactional", "promotional"] as const;
export type CommunicationClassification = (typeof COMMUNICATION_CLASSIFICATIONS)[number];

/** Legacy production statuses that may already exist in whatsapp_messages. */
export const LEGACY_OUTBOX_STATUSES = ["queued", "sent", "delivered", "read", "failed"] as const;

export const OUTBOX_STATUSES = [
  "queued",
  "processing",
  "submitted",
  "sent",
  "delivered",
  "read",
  "retryable",
  "failed",
  "cancelled",
  "configuration_required",
  "suppressed",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/**
 * Centralized outbox state machine (application transitions).
 *
 * AiSensy note: Campaign API HTTP success means the provider *accepted* the request.
 * That is recorded as `sent` with provider_status often "submitted". We do **not** treat
 * HTTP success as WhatsApp `delivered`. `submitted` is retained in the vocabulary for
 * provider-aligned wording but the app normally writes `sent` after API accept.
 * Delivered/read come only from verified correlated webhook events.
 */
export const OUTBOX_TRANSITIONS: Record<OutboxStatus, readonly OutboxStatus[]> = {
  queued: ["processing", "cancelled", "suppressed", "configuration_required"],
  processing: ["sent", "submitted", "retryable", "failed", "configuration_required", "cancelled", "suppressed"],
  submitted: ["sent", "delivered", "read", "failed"],
  sent: ["delivered", "read", "failed"],
  delivered: ["read"],
  read: [],
  retryable: ["processing", "cancelled", "suppressed"],
  /** Authorized retry/config recovery sets queued (not direct processing). */
  configuration_required: ["queued", "cancelled", "suppressed"],
  failed: ["queued"], // authorized manual retry only (ops layer)
  cancelled: [],
  suppressed: [],
};

export function isValidOutboxTransition(from: string, to: string): boolean {
  const a = String(from).toLowerCase() as OutboxStatus;
  const b = String(to).toLowerCase() as OutboxStatus;
  if (a === b) return true;
  const allowed = OUTBOX_TRANSITIONS[a];
  if (!allowed) return false;
  return allowed.includes(b);
}

/** Webhook delivery progression — never regress; ignore unknown. */
export function canAdvanceOutboxStatus(from: string, to: string): boolean {
  const fromNorm = String(from).toLowerCase();
  const toNorm = String(to).toLowerCase();
  if (fromNorm === toNorm) return true;

  // Never leave terminal / suppressed via webhook
  if (["cancelled", "suppressed"].includes(fromNorm)) return false;
  // Do not reopen failed/processing via webhook delivery events
  if (fromNorm === "failed" && ["delivered", "read", "sent", "processing"].includes(toNorm)) return false;
  if (fromNorm === "delivered" && toNorm === "sent") return false;
  if (fromNorm === "read" && ["delivered", "sent", "submitted"].includes(toNorm)) return false;
  if (fromNorm === "delivered" && toNorm === "processing") return false;

  const webhookTargets = new Set(["sent", "delivered", "read", "failed"]);
  if (!webhookTargets.has(toNorm)) return false;

  // Prefer explicit transition table when from is known
  if (isValidOutboxTransition(fromNorm, toNorm)) return true;

  // Allow delivery/read advancement from processing/queued/retryable/config if webhook arrives early
  if (["queued", "processing", "retryable", "configuration_required", "submitted"].includes(fromNorm)) {
    return ["sent", "delivered", "read", "failed"].includes(toNorm);
  }

  return false;
}

export function normalizeProviderDeliveryStatus(raw: string | null | undefined): OutboxStatus | null {
  const value = String(raw ?? "").toLowerCase().trim();
  if (!value) return null;
  if (["delivered", "delivery"].includes(value)) return "delivered";
  if (["read", "seen"].includes(value)) return "read";
  // Provider "submitted"/"accepted"/"sent" → outbox `sent` (API accept), not WhatsApp delivered
  if (["sent", "submitted", "accepted"].includes(value)) return "sent";
  if (["failed", "error", "undelivered", "rejected"].includes(value)) return "failed";
  // Do not map generic "success" to delivered — ambiguous with API accept
  return null;
}

export function classifyProviderFailure(input: {
  httpStatus?: number;
  code?: string | null;
  configurationRequired?: boolean;
}): "retryable" | "terminal" | "configuration_required" {
  if (input.configurationRequired) return "configuration_required";
  const code = String(input.code ?? "").toLowerCase();
  if (["invalid_mobile", "invalid_template", "consent_suppressed", "permanent", "rejected"].some((c) => code.includes(c))) {
    return "terminal";
  }
  // Ambiguous timeout: durable outbox owns retry; treat as retryable once (processor schedules)
  if (code.includes("timeout") || code.includes("ambiguous")) return "retryable";
  const status = input.httpStatus ?? 0;
  if (status === 408 || status === 429 || status >= 500) return "retryable";
  if (status >= 400 && status < 500) return "terminal";
  return "retryable";
}

/** Bounded exponential backoff with jitter (seconds). Outbox processor owns retries. */
export function computeBackoffSeconds(attempt: number, base = 30, max = 3600): number {
  const exp = Math.min(max, base * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(30, exp * 0.2));
  return Math.min(max, exp + jitter);
}

export function maskMobile(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 6) return "******";
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

export function buildCommunicationIdempotencyKey(parts: string[]): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(":")
    .slice(0, 240);
}

export const COMMUNICATION_PURPOSES = [
  "application_submitted",
  "application_status",
  "document_required",
  "payment_due",
  "payment_success",
  "follow_up_due",
  "application_completed",
  "feedback_request",
  "customer_welcome",
  "staff_alert",
  "failed_message_alert",
  "manual_resend",
] as const;

export type CommunicationPurpose = (typeof COMMUNICATION_PURPOSES)[number];

/** Server-side only — never accept browser-supplied classification for known purposes. */
export function purposeClassification(purpose: string): CommunicationClassification {
  if (["feedback_request", "customer_welcome"].includes(purpose)) return "promotional";
  return "transactional";
}

export function isRetryEligibleStatus(status: string): boolean {
  return ["queued", "retryable", "failed", "configuration_required", "processing"].includes(
    String(status).toLowerCase(),
  );
}

export function isCancelEligibleStatus(status: string): boolean {
  return ["queued", "retryable", "processing", "configuration_required", "failed", "suppressed"].includes(
    String(status).toLowerCase(),
  );
}
