/** Pure helpers for walk-in application create (unit-testable, no server-only). */

export type AssignmentResolution = {
  assigneeId: string | null;
  reason: "explicit_admin_selection" | "service_eligible_assignee" | "branch_owner_mapping" | "unassigned_queue";
  bySystem: boolean;
};

export function maskIndianMobile(mobile: string): string {
  const digits = String(mobile ?? "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return "**********";
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

export function normalizeIndianMobileDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobileDigits(value));
}

export function resolveAuthoritativePrice(
  serviceFee: number,
  clientRequestedPrice?: number | null,
): {
  amount: number;
  original: number;
  overridden: boolean;
} {
  const original = Number(serviceFee);
  const safeOriginal = Number.isFinite(original) ? original : 0;
  if (clientRequestedPrice == null) {
    return { amount: safeOriginal, original: safeOriginal, overridden: false };
  }
  const requested = Number(clientRequestedPrice);
  if (!Number.isFinite(requested) || requested < 0) {
    return { amount: safeOriginal, original: safeOriginal, overridden: false };
  }
  if (requested === safeOriginal) {
    return { amount: safeOriginal, original: safeOriginal, overridden: false };
  }
  return { amount: requested, original: safeOriginal, overridden: true };
}

/**
 * Safe first-version assignment:
 * 1) explicit admin selection
 * 2) service-configured eligible assignee (if present)
 * 3) branch/owner mapping (if present)
 * 4) explicit unassigned queue — never silent arbitrary assign
 */
export function resolveWalkInAssignment(input: {
  explicitAssigneeId?: string | null;
  serviceDefaultAssigneeId?: string | null;
  branchOwnerId?: string | null;
}): AssignmentResolution {
  const explicit = input.explicitAssigneeId?.trim() || null;
  if (explicit) {
    return { assigneeId: explicit, reason: "explicit_admin_selection", bySystem: false };
  }
  const serviceDefault = input.serviceDefaultAssigneeId?.trim() || null;
  if (serviceDefault) {
    return { assigneeId: serviceDefault, reason: "service_eligible_assignee", bySystem: true };
  }
  const branchOwner = input.branchOwnerId?.trim() || null;
  if (branchOwner) {
    return { assigneeId: branchOwner, reason: "branch_owner_mapping", bySystem: true };
  }
  return { assigneeId: null, reason: "unassigned_queue", bySystem: true };
}

export function assertOverrideAllowed(input: {
  overridden: boolean;
  overrideReason?: string | null;
  actorCanOverride: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!input.overridden) return { ok: true };
  if (!input.actorCanOverride) {
    return { ok: false, error: "Price override is not permitted for this role." };
  }
  if (!String(input.overrideReason ?? "").trim()) {
    return { ok: false, error: "Override reason is required when changing the price." };
  }
  return { ok: true };
}

/**
 * Decide applications.user_id from proven server-side facts only.
 * Proven production link: customers.id == auth.users.id.
 * Never invent Auth ids from email / admin actor / browser input.
 */
export function resolveApplicationAuthUserId(input: {
  customerId: string;
  /** Server-resolved: customers.id exists in auth.users */
  customerIdIsAuthUser: boolean;
  /** Optional Auth user id created/verified by server for this customer */
  serverResolvedAuthUserId?: string | null;
  /** Reject if browser/client attempts to supply a different Auth id */
  browserProvidedAuthUserId?: string | null;
  actorId?: string | null;
}): { ok: true; userId: string | null } | { ok: false; error: string } {
  const customerId = String(input.customerId || "").trim();
  if (!customerId) {
    return { ok: false, error: "customer_required" };
  }

  const browserId = input.browserProvidedAuthUserId?.trim() || null;
  if (browserId && browserId !== customerId) {
    return { ok: false, error: "browser_cannot_choose_auth_user" };
  }

  const actorId = input.actorId?.trim() || null;
  if (actorId && actorId === customerId) {
    // Admin/staff actor must never become the customer application owner.
    return { ok: false, error: "actor_cannot_own_customer_application" };
  }

  const serverId = input.serverResolvedAuthUserId?.trim() || null;
  if (serverId) {
    if (serverId !== customerId) {
      return { ok: false, error: "customer_auth_user_mismatch" };
    }
    if (actorId && serverId === actorId) {
      return { ok: false, error: "customer_auth_user_mismatch" };
    }
    return { ok: true, userId: serverId };
  }

  if (input.customerIdIsAuthUser) {
    return { ok: true, userId: customerId };
  }

  // Existing PIN-only / unlinked customer: ownership via customer_id; user_id stays null.
  return { ok: true, userId: null };
}

export type WalkInCleanupStep = "deleted" | "missing" | "failed" | "skipped_not_owned";

/**
 * Classify compensating cleanup after a request-scoped Auth/customer create failure.
 * Only request-created IDs may be deleted; pre-existing rows are never owned by the request.
 */
export function classifyWalkInCleanupOutcome(input: {
  customerCleanup: WalkInCleanupStep;
  authCleanup: WalkInCleanupStep;
}): {
  clean: boolean;
  reconciliationRequired: boolean;
  severity: "none" | "high";
  code: "cleanup_ok" | "cleanup_reconciliation_required";
} {
  const failed =
    input.customerCleanup === "failed" || input.authCleanup === "failed";
  if (failed) {
    return {
      clean: false,
      reconciliationRequired: true,
      severity: "high",
      code: "cleanup_reconciliation_required",
    };
  }
  return {
    clean: true,
    reconciliationRequired: false,
    severity: "none",
    code: "cleanup_ok",
  };
}

/** Safe client-facing failure when orphan remnants may remain. */
export function walkInReconciliationClientError(correlationId: string): {
  ok: false;
  error: string;
  status: number;
  reconciliationRequired: true;
  correlationId: string;
} {
  return {
    ok: false,
    error: "Customer setup needs reconciliation. Retry with the same details or contact support.",
    status: 409,
    reconciliationRequired: true,
    correlationId,
  };
}

export type WalkInNotificationState =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "configuration_required"
  | "skipped";

export function mapWhatsAppResultToUiState(result: {
  ok: boolean;
  code?: string;
  queued?: boolean;
  deduped?: boolean;
}): WalkInNotificationState {
  if (result.ok && result.deduped) return "sent";
  if (result.ok) return "sent";
  if (result.code === "configuration_required" || result.code === "queued" || result.queued) {
    return result.code === "configuration_required" ? "configuration_required" : "queued";
  }
  if (result.code === "database_upgrade_required") return "configuration_required";
  if (result.code === "supabase_missing") return "configuration_required";
  return "failed";
}

// ── Walk-in create failure reporting ────────────────────────────────────────

/**
 * Reasons `create_walk_in_application_core` rejects a walk-in create.
 * Mirrors the `raise exception '<code>'` list in
 * 20260805120000_crm_walk_in_application_foundation.sql.
 */
export const WALK_IN_FAILURE_CODES = [
  "actor_required",
  "idempotency_key_required",
  "customer_required",
  "service_required",
  "customer_not_found",
  "customer_mobile_invalid",
  "customer_auth_user_not_found",
  "customer_auth_user_mismatch",
  "service_not_found",
  "inactive_service",
  "invalid_override_amount",
  "override_reason_required",
  "assignee_not_found",
  "walk_in_application_failed",
] as const;

export type WalkInFailureCode = (typeof WALK_IN_FAILURE_CODES)[number];

/**
 * Turn a rejection code into something the counter operator can act on.
 *
 * Every one of these used to surface as the same dead-end string,
 * "Application could not be created.", so an admin had no way to tell an
 * inactive service from a bad assignee from a genuine server fault — and no
 * indication of what to change before retrying.
 */
const WALK_IN_FAILURE_DETAIL: Record<WalkInFailureCode, { message: string; status: number }> = {
  actor_required: {
    message: "Your session did not carry a valid admin identity. Sign in again and retry.",
    status: 401,
  },
  idempotency_key_required: {
    message: "This form lost its submission key. Reload the page and re-enter the application.",
    status: 400,
  },
  customer_required: {
    message: "No customer was attached to this application. Look the customer up again.",
    status: 400,
  },
  service_required: {
    message: "No service was selected. Choose a service and retry.",
    status: 400,
  },
  customer_not_found: {
    message: "That customer record no longer exists. Search for the customer again.",
    status: 404,
  },
  customer_mobile_invalid: {
    message: "The customer's saved mobile number is not a valid 10-digit Indian number. Fix it on the customer record first.",
    status: 400,
  },
  customer_auth_user_not_found: {
    message: "The customer's login account could not be found. Create the application without linking, or repair the account first.",
    status: 409,
  },
  customer_auth_user_mismatch: {
    message: "This customer record is linked to a different login account. Resolve the duplicate before creating an application.",
    status: 409,
  },
  service_not_found: {
    message: "That service is no longer in the catalogue. Pick another service.",
    status: 404,
  },
  inactive_service: {
    message: "That service is inactive. Activate it in Services, or pick an active one.",
    status: 400,
  },
  invalid_override_amount: {
    message: "The price override is not a valid amount. Clear it or enter a valid figure.",
    status: 400,
  },
  override_reason_required: {
    message: "A price override needs a reason. Add one and retry.",
    status: 400,
  },
  assignee_not_found: {
    message: "The chosen assignee is not an eligible user. Leave it unassigned or pick someone else.",
    status: 400,
  },
  walk_in_application_failed: {
    // The database function's own catch-all: it reached the write and rolled back.
    message:
      "The database rejected the application and rolled it back. Nothing was created — check status before retrying.",
    status: 500,
  },
};

export function isWalkInFailureCode(value: unknown): value is WalkInFailureCode {
  return WALK_IN_FAILURE_CODES.includes(String(value ?? "") as WalkInFailureCode);
}

/** Find the rejection code inside a raw Postgres error string. */
export function matchWalkInFailureCode(rawMessage: string): WalkInFailureCode | null {
  const msg = String(rawMessage ?? "");
  return WALK_IN_FAILURE_CODES.find((code) => msg.includes(code)) ?? null;
}

export function describeWalkInFailure(code: WalkInFailureCode): { message: string; status: number } {
  return WALK_IN_FAILURE_DETAIL[code];
}
