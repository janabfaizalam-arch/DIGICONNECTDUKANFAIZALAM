export const APPLICATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "payment_success", label: "Payment Success" },
  { value: "submitted", label: "Submitted" },
  { value: "documents_required", label: "Documents Required" },
  { value: "documents_verified", label: "Documents Verified" },
  { value: "assigned_to_agent", label: "Assigned to Agent" },
  { value: "in_progress", label: "In Progress" },
  { value: "document_pending", label: "Document Pending" },
  { value: "objection", label: "Objection" },
  { value: "completed", label: "Completed" },
  { value: "delivered", label: "Delivered" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS_OPTIONS)[number]["value"];

export const APPLICATION_STATUS_VALUES = APPLICATION_STATUS_OPTIONS.map((option) => option.value);

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = APPLICATION_STATUS_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {} as Record<ApplicationStatus, string>,
);

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return APPLICATION_STATUS_VALUES.includes(value as ApplicationStatus);
}

export function getApplicationStatusLabel(value: unknown) {
  if (isApplicationStatus(value)) return APPLICATION_STATUS_LABELS[value];
  return String(value ?? "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
