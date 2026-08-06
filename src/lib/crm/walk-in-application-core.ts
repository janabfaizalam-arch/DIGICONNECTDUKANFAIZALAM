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
