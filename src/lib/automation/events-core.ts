/** Pure automation event/rule types and idempotency builders. */

export const AUTOMATION_EVENT_TYPES = [
  "customer.created",
  "customer.onboarding_requested",
  "lead.created",
  "lead.assigned",
  "lead.followup_due",
  "lead.converted",
  "application.created",
  "application.assigned",
  "application.status_changed",
  "application.document_required",
  "application.document_uploaded",
  "application.payment_due",
  "application.payment_received",
  "application.completed",
  "communication.failed",
] as const;

export type AutomationEventType = (typeof AUTOMATION_EVENT_TYPES)[number];

export const AUTOMATION_ACTION_TYPES = [
  "enqueue_communication",
  "create_admin_alert",
  "create_staff_alert",
  "schedule_internal_followup_alert",
  "record_activity",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export const AUTOMATION_EVENT_STATUSES = [
  "pending",
  "processing",
  "completed",
  "retryable",
  "failed",
  "cancelled",
  "suppressed",
] as const;

export type AutomationEventStatus = (typeof AUTOMATION_EVENT_STATUSES)[number];

/** Inactive until product wiring exists (typed but no producer). */
export const INACTIVE_AUTOMATION_EVENT_TYPES: readonly AutomationEventType[] = [
  "customer.onboarding_requested",
] as const;

export function buildAutomationEventIdempotencyKey(parts: string[]): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(":")
    .slice(0, 240);
}

export function isAllowedAutomationEventType(value: string): value is AutomationEventType {
  return (AUTOMATION_EVENT_TYPES as readonly string[]).includes(value);
}

export function isAllowedAutomationActionType(value: string): value is AutomationActionType {
  return (AUTOMATION_ACTION_TYPES as readonly string[]).includes(value);
}

/** Whitelisted condition operators only — no code/SQL. */
export const SAFE_CONDITION_OPERATORS = ["eq", "neq", "in", "exists"] as const;
export type SafeConditionOperator = (typeof SAFE_CONDITION_OPERATORS)[number];

export type SafeCondition = {
  field: "event_type" | "entity_type" | "delivery_mode" | "classification";
  op: SafeConditionOperator;
  value: string | string[] | boolean;
};

export function evaluateSafeConditions(
  conditions: SafeCondition[] | undefined,
  ctx: Record<string, string | boolean | null | undefined>,
): boolean {
  if (!conditions?.length) return true;
  for (const c of conditions) {
    const actual = ctx[c.field];
    if (c.op === "exists") {
      if (actual == null || actual === "") return false;
      continue;
    }
    if (c.op === "eq") {
      if (String(actual) !== String(c.value)) return false;
      continue;
    }
    if (c.op === "neq") {
      if (String(actual) === String(c.value)) return false;
      continue;
    }
    if (c.op === "in") {
      const list = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)];
      if (!list.includes(String(actual))) return false;
      continue;
    }
    return false;
  }
  return true;
}

export const ALERT_TYPES = [
  "communication_failed",
  "communication_configuration_required",
  "processing_lease_recovered",
  "automation_event_failed",
  "missing_template_mapping",
  "followup_overdue",
  "unassigned_lead",
  "unassigned_application",
  "application_assigned",
  "daily_summary_ready",
] as const;

export type OpsAlertType = (typeof ALERT_TYPES)[number];

export function buildAlertIdempotencyKey(parts: string[]): string {
  return buildAutomationEventIdempotencyKey(parts);
}
