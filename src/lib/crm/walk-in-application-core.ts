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
