import { paymentStatusLabels, statusLabels, type ApplicationStatus, type PaymentStatus } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

const applicationClasses: Record<ApplicationStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  lead_submitted: "bg-blue-50 text-blue-700 ring-blue-100",
  documents_pending: "bg-amber-50 text-amber-700 ring-amber-100",
  documents_under_review: "bg-amber-50 text-amber-700 ring-amber-100",
  documents_required: "bg-rose-50 text-rose-700 ring-rose-100",
  payment_pending: "bg-orange-50 text-orange-700 ring-orange-100",
  payment_verified: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  payment_failed: "bg-rose-50 text-rose-700 ring-rose-100",
  cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  in_process: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  in_progress: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  application_processing: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  submitted: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  submitted_to_department: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  under_government_review: "bg-purple-50 text-purple-700 ring-purple-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-rose-50 text-rose-700 ring-rose-100",
};

const paymentClasses: Record<PaymentStatus, string> = {
  unpaid: "bg-slate-100 text-slate-700 ring-slate-200",
  pending: "bg-orange-50 text-orange-700 ring-orange-100",
  submitted: "bg-blue-50 text-blue-700 ring-blue-100",
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-rose-50 text-rose-700 ring-rose-100",
  failed: "bg-rose-50 text-rose-700 ring-rose-100",
  refunded: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", applicationClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", paymentClasses[status])}>
      {paymentStatusLabels[status]}
    </span>
  );
}
