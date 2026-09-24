import { cn } from "@/lib/utils";

type DashboardEmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

/**
 * What a section shows when it has nothing yet.
 *
 * A brand-new partner sees a lot of these at once, so it is deliberately not a
 * grey dashed box: a tinted surface with a soft brand wash reads as "not yet"
 * rather than "broken", which is what the whole first session looks like
 * before any application exists.
 */
export function DashboardEmptyState({ title, description, className }: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-dashed border-[var(--dcp-line-2)]",
        "bg-[var(--dcp-surface-2)] px-4 py-6 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 left-1/2 h-28 w-40 -translate-x-1/2 rounded-full bg-[var(--dcp-brand-soft)] blur-2xl"
      />
      <p className="relative text-[13px] font-bold text-[var(--dcp-ink-2)]">{title}</p>
      {description ? (
        <p className="relative mt-1 text-[11.5px] font-medium text-[var(--dcp-ink-3)]">{description}</p>
      ) : null}
    </div>
  );
}
