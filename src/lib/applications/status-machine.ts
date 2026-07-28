import {
  APPLICATION_STATUS_OPTIONS,
  isApplicationStatus,
  type ApplicationStatus,
} from "@/lib/application-status";

/** Terminal statuses — no further workflow edits. */
export const TERMINAL_APPLICATION_STATUSES: ApplicationStatus[] = [
  "cancelled",
  "refunded",
];

/** Completion-like statuses that require a final document. */
export const COMPLETION_STATUSES: ApplicationStatus[] = ["completed", "delivered"];

const PAID_PAYMENT_STATUSES = new Set([
  "paid",
  "verified",
  "success",
  "captured",
  "completed",
]);

/**
 * Allowed next statuses from a given status.
 * Unknown/legacy statuses (after alias mapping fails) can move to any non-terminal workflow status.
 */
const TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  draft: ["payment_pending", "submitted", "cancelled"],
  payment_pending: ["payment_success", "submitted", "cancelled", "refunded"],
  payment_success: ["submitted", "documents_required", "documents_verified", "assigned_to_agent", "in_progress", "cancelled"],
  submitted: [
    "documents_required",
    "documents_verified",
    "assigned_to_agent",
    "in_progress",
    "document_pending",
    "objection",
    "cancelled",
  ],
  documents_required: [
    "documents_verified",
    "document_pending",
    "submitted",
    "in_progress",
    "objection",
    "cancelled",
  ],
  document_pending: [
    "documents_required",
    "documents_verified",
    "in_progress",
    "objection",
    "cancelled",
  ],
  documents_verified: [
    "assigned_to_agent",
    "in_progress",
    "documents_required",
    "objection",
    "completed",
    "cancelled",
  ],
  assigned_to_agent: ["in_progress", "documents_required", "objection", "completed", "cancelled"],
  in_progress: [
    "documents_required",
    "document_pending",
    "objection",
    "completed",
    "delivered",
    "cancelled",
  ],
  objection: [
    "documents_required",
    "document_pending",
    "in_progress",
    "submitted",
    "cancelled",
  ],
  // Completed is locked for normal workflow — refund only.
  completed: ["refunded"],
  delivered: ["refunded"],
  rejected: ["cancelled", "refunded"],
  cancelled: [],
  refunded: [],
};

/** Map legacy / alternate status strings onto canonical ApplicationStatus values. */
const LEGACY_STATUS_ALIASES: Record<string, ApplicationStatus> = {
  in_process: "in_progress",
  processing: "in_progress",
  under_review: "in_progress",
  documents_pending: "documents_required",
  awaiting_documents: "documents_required",
  documents_received: "documents_verified",
  paid: "payment_success",
  complete: "completed",
  approved: "documents_verified",
  pending: "submitted",
};

export function normalizeWorkflowStatus(value: unknown): ApplicationStatus | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (LEGACY_STATUS_ALIASES[raw]) return LEGACY_STATUS_ALIASES[raw];
  if (isApplicationStatus(raw)) return raw;
  return null;
}

export function getAllowedNextStatuses(from: unknown): ApplicationStatus[] {
  const current = normalizeWorkflowStatus(from);
  if (!current) {
    return APPLICATION_STATUS_OPTIONS.map((o) => o.value).filter(
      (s) => !TERMINAL_APPLICATION_STATUSES.includes(s) && !COMPLETION_STATUSES.includes(s),
    );
  }
  return TRANSITIONS[current] ?? [];
}

export type StatusTransitionContext = {
  hasFinalDocument?: boolean;
  missingRequiredDocuments?: boolean;
  paymentStatus?: string | null;
};

export function canTransitionStatus(
  from: unknown,
  to: unknown,
  ctx: StatusTransitionContext = {},
): { ok: true } | { ok: false; message: string } {
  const fromStatus = normalizeWorkflowStatus(from);
  const toStatus = normalizeWorkflowStatus(to);

  if (!toStatus) {
    return { ok: false, message: "Invalid target status." };
  }

  if (fromStatus === toStatus) {
    return { ok: true };
  }

  const fromKey = String(fromStatus ?? "");

  if (fromStatus && TERMINAL_APPLICATION_STATUSES.includes(fromStatus)) {
    return { ok: false, message: `Application is ${fromStatus} and cannot be updated.` };
  }

  // Completed / delivered are locked except refund.
  if (fromStatus && COMPLETION_STATUSES.includes(fromStatus) && toStatus !== "refunded") {
    return { ok: false, message: "Completed applications cannot change status (except refund)." };
  }

  if (COMPLETION_STATUSES.includes(toStatus)) {
    if (!ctx.hasFinalDocument) {
      return { ok: false, message: "Upload a final document before marking completed." };
    }
    if (ctx.missingRequiredDocuments) {
      return { ok: false, message: "Required documents are still missing." };
    }
    if (fromKey === "payment_pending" || fromKey === "draft") {
      return { ok: false, message: "Cannot complete while payment is still pending." };
    }
    if (fromKey === "cancelled" || fromKey === "refunded") {
      return { ok: false, message: `Application is ${fromKey} and cannot be completed.` };
    }
    // Allow complete from active workflow states when final document present.
    return { ok: true };
  }

  const allowed = getAllowedNextStatuses(fromStatus);
  if (fromStatus && allowed.length && !allowed.includes(toStatus)) {
    return {
      ok: false,
      message: `Cannot move from ${fromStatus.replace(/_/g, " ")} to ${toStatus.replace(/_/g, " ")}.`,
    };
  }

  return { ok: true };
}

export function isPaidPaymentStatus(value: string | null | undefined) {
  return PAID_PAYMENT_STATUSES.has(String(value ?? "").toLowerCase());
}

export function shouldShowPaymentReminder(paymentStatus: string | null | undefined, status: unknown) {
  if (isPaidPaymentStatus(paymentStatus)) return false;
  const s = normalizeWorkflowStatus(status);
  if (s === "cancelled" || s === "refunded" || s === "completed" || s === "delivered") return false;
  return true;
}

export function shouldShowCompleteAction(status: unknown) {
  const s = normalizeWorkflowStatus(status);
  if (!s) return true;
  return !COMPLETION_STATUSES.includes(s) && !TERMINAL_APPLICATION_STATUSES.includes(s);
}

export function isWorkflowEditable(status: unknown) {
  const s = normalizeWorkflowStatus(status);
  if (!s) return true;
  return !TERMINAL_APPLICATION_STATUSES.includes(s) && !COMPLETION_STATUSES.includes(s);
}

export function workflowSelectOptions(from: unknown) {
  const current = normalizeWorkflowStatus(from);
  const allowed = new Set(getAllowedNextStatuses(from));
  if (current) allowed.add(current);

  // Admins can complete (final doc enforced server-side) from active states only.
  if (current && isWorkflowEditable(current)) {
    allowed.add("completed");
  }

  return APPLICATION_STATUS_OPTIONS.filter((o) => allowed.has(o.value));
}

/** Customer-facing WhatsApp events for status transitions (excludes noisy assignment-only pings). */
export function whatsappEventForStatusChange(
  previousStatus: unknown,
  nextStatus: unknown,
):
  | "documents_required"
  | "objection"
  | "processing_started"
  | "objection_resolved"
  | "under_review"
  | null {
  const prev = normalizeWorkflowStatus(previousStatus);
  const next = normalizeWorkflowStatus(nextStatus);
  if (!next || prev === next) return null;

  const rawNext = String(nextStatus ?? "")
    .trim()
    .toLowerCase();

  if (next === "documents_required" || next === "document_pending") return "documents_required";
  if (next === "objection") return "objection";
  if (next === "in_progress" && prev === "objection") return "objection_resolved";
  // `under_review` normalizes to in_progress — detect raw value for the dedicated campaign.
  if (rawNext === "under_review" || rawNext === "review") return "under_review";
  if (next === "in_progress") return "processing_started";
  return null;
}
