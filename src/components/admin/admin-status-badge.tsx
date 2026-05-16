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

function tone(status: string) {
  if (status === "completed" || status === "verified") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "rejected" || status === "failed" || status === "payment_failed") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (status.includes("pending") || status === "new" || status === "in_process" || status === "in_progress") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

export function AdminStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", tone(status))}>{label(status)}</span>;
}
