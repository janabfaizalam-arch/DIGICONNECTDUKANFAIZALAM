import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  in_process: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  under_review: "bg-violet-50 text-violet-700 border-violet-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  documents_required: "bg-orange-50 text-orange-700 border-orange-200",
  document_pending: "bg-orange-50 text-orange-700 border-orange-200",
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
};

type StatusBadgeProps = {
  status: string;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = String(status || "").toLowerCase();
  const style = STATUS_STYLES[key] ?? "bg-slate-50 text-slate-600 border-slate-200";
  const text = label ?? key.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize tracking-wide",
        style,
        className,
      )}
    >
      {text}
    </span>
  );
}

export function TierBadge({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800",
        className,
      )}
    >
      {name}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
      Verified Digi Partner
    </span>
  );
}
