/** Pure delivery-mode helpers (unit-testable). Server-only at call sites; this module stays pure. */

export const CRM_NOTIFICATION_DELIVERY_MODES = ["queue", "direct", "disabled"] as const;
export type CrmNotificationDeliveryMode = (typeof CRM_NOTIFICATION_DELIVERY_MODES)[number];

export type DeliveryModeResolution = {
  mode: CrmNotificationDeliveryMode;
  /** True when env was missing, blank, or not an exact known token after normalize. */
  failClosed: boolean;
  /** Safe operational reason — never includes full env or secrets. */
  reason:
    | "exact_queue"
    | "exact_direct"
    | "exact_disabled"
    | "missing"
    | "blank"
    | "unknown";
  /** Raw length only (never the value) for ops diagnostics. */
  rawLength: number;
};

/**
 * Deterministic normalize: trim + lowercase. Ambiguous values never become `direct`.
 *
 * Fail-closed rule (P0):
 * - Exact `queue` → queue
 * - Exact `direct` → direct (temporary compatibility; must be explicit)
 * - Exact `disabled` → disabled
 * - Missing / blank / unknown → disabled (never live-send)
 *
 * No queue→direct fallback. No browser override.
 * OTP does NOT use CRM_NOTIFICATION_DELIVERY_MODE — OTP remains on its own path.
 */
export function resolveCrmNotificationDeliveryModeDetailed(
  env: NodeJS.ProcessEnv = process.env,
): DeliveryModeResolution {
  const present = Object.prototype.hasOwnProperty.call(env, "CRM_NOTIFICATION_DELIVERY_MODE");
  const rawOriginal = present ? env.CRM_NOTIFICATION_DELIVERY_MODE : undefined;
  if (rawOriginal === undefined || rawOriginal === null) {
    return { mode: "disabled", failClosed: true, reason: "missing", rawLength: 0 };
  }
  const asString = String(rawOriginal);
  if (asString.trim() === "") {
    return { mode: "disabled", failClosed: true, reason: "blank", rawLength: asString.length };
  }
  const raw = asString.trim().toLowerCase();
  if (raw === "queue") {
    return { mode: "queue", failClosed: false, reason: "exact_queue", rawLength: asString.length };
  }
  if (raw === "direct") {
    return { mode: "direct", failClosed: false, reason: "exact_direct", rawLength: asString.length };
  }
  if (raw === "disabled") {
    return { mode: "disabled", failClosed: false, reason: "exact_disabled", rawLength: asString.length };
  }
  return { mode: "disabled", failClosed: true, reason: "unknown", rawLength: asString.length };
}

/**
 * Effective CRM non-OTP notification delivery mode.
 * Default when unset/blank/unknown: `disabled` (fail closed — no live send).
 */
export function resolveCrmNotificationDeliveryMode(
  env: NodeJS.ProcessEnv = process.env,
): CrmNotificationDeliveryMode {
  return resolveCrmNotificationDeliveryModeDetailed(env).mode;
}

export function isQueueDeliveryMode(mode: CrmNotificationDeliveryMode): boolean {
  return mode === "queue";
}

export function isDirectDeliveryMode(mode: CrmNotificationDeliveryMode): boolean {
  return mode === "direct";
}

export function isDisabledDeliveryMode(mode: CrmNotificationDeliveryMode): boolean {
  return mode === "disabled";
}

/** Whether outbox processor may claim/send AiSensy work. */
export function outboxMaySend(mode: CrmNotificationDeliveryMode): boolean {
  return mode === "queue";
}

/** Whether automation may enqueue a claimable customer WhatsApp. */
export function automationMayEnqueueCustomerWhatsApp(mode: CrmNotificationDeliveryMode): boolean {
  return mode === "queue";
}
