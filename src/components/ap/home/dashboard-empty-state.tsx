import { cn } from "@/lib/utils";

type DashboardEmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function DashboardEmptyState({ title, description, className }: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs font-medium text-slate-500">{description}</p> : null}
    </div>
  );
}
