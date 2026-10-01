import { cn } from "@/lib/utils";

function label(status: string) {
  if (status === "verified") {
    return "Paid";
  }

  if (status === "payment_pending") {
    return "Payment Pending";
  }

  if (status === "payment_failed") {
    return "Payment Failed";
  }

  if (["documents_pending", "in_process", "submitted", "in_progress"].includes(status)) {
    return "In Progress";
  }

  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Status to meaning, then meaning to colour.
 *
 * These were `bg-emerald-50 text-emerald-700 ring-emerald-100` and friends.
 * The colours are unchanged in intent — a completed application is still
 * green — but they now resolve through the semantic tokens, so the panel can
 * be re-themed (and read in dark mode) from one file instead of this one
 * plus the 143 other places that picked their own green.
 */
function tone(status: string) {
  if (status === "completed" || status === "verified") {
    return "bg-ds-success-soft text-ds-success ring-ds-success-border";
  }

  if (status === "rejected" || status === "failed" || status === "payment_failed") {
    return "bg-ds-danger-soft text-ds-danger ring-ds-danger-border";
  }

  if (status.includes("pending") || status === "new" || status === "in_process" || status === "in_progress") {
    return "bg-ds-warning-soft text-ds-warning ring-ds-warning-border";
  }

  return "bg-ds-info-soft text-ds-info ring-ds-info-border";
}

export function AdminStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <span className="text-sm text-ds-text-muted">-</span>;
  }

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", tone(status))}>{label(status)}</span>;
}
