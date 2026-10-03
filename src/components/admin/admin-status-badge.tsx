import { STATUS_TONE_CLASS, type StatusTone } from "@/lib/admin/status-tone";
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
 * Status to meaning.
 *
 * The application vocabulary does not fit the shared defaults word for word —
 * `verified` means paid here, and anything containing "pending" is waiting —
 * so this screen family keeps its own reading. What it no longer keeps is the
 * colour: that resolves through `STATUS_TONE_CLASS`, so the panel has one green
 * rather than this file's plus the 143 other places that picked their own.
 */
function tone(status: string): StatusTone {
  if (status === "completed" || status === "verified") {
    return "success";
  }

  if (status === "rejected" || status === "failed" || status === "payment_failed") {
    return "danger";
  }

  if (status.includes("pending") || status === "new" || status === "in_process" || status === "in_progress") {
    return "warning";
  }

  return "info";
}

export function AdminStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <span className="text-sm text-ds-text-muted">-</span>;
  }

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", STATUS_TONE_CLASS[tone(status)])}>{label(status)}</span>;
}
