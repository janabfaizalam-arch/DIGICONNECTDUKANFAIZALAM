import "server-only";

/** Office CRM work statuses shown in Google Sheets. */
export type CrmWorkStatus = "New" | "In Process" | "Documents Pending" | "Completed" | "Cancelled";

export function mapApplicationStatusToCrm(status: string | null | undefined): CrmWorkStatus {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();

  if (["cancelled", "rejected", "refunded"].includes(value)) return "Cancelled";
  if (["completed", "delivered"].includes(value)) return "Completed";
  if (
    [
      "documents_required",
      "document_pending",
      "documents_pending",
      "objection",
    ].includes(value)
  ) {
    return "Documents Pending";
  }
  if (
    [
      "in_progress",
      "in_process",
      "assigned_to_agent",
      "documents_verified",
      "under_review",
      "payment_success",
      "submitted",
    ].includes(value)
  ) {
    return "In Process";
  }
  // draft, payment_pending, new, lead_submitted, etc.
  return "New";
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Status-driven follow-up / completion dates for Customer Work rows.
 */
export function crmDatesForStatus(status: string | null | undefined): {
  workStatus: CrmWorkStatus;
  nextFollowUp: string;
  completedDate: string;
} {
  const workStatus = mapApplicationStatusToCrm(status);

  if (workStatus === "Completed") {
    return { workStatus, nextFollowUp: "", completedDate: todayIso() };
  }
  if (workStatus === "Cancelled") {
    return { workStatus, nextFollowUp: "", completedDate: "" };
  }
  if (workStatus === "New") {
    return { workStatus, nextFollowUp: addDaysIso(1), completedDate: "" };
  }
  // In Process / Documents Pending — keep an active follow-up (tomorrow if not set elsewhere)
  return { workStatus, nextFollowUp: addDaysIso(1), completedDate: "" };
}

export function defaultExpectedCompletionIso(daysFromNow = 7): string {
  return addDaysIso(daysFromNow);
}
