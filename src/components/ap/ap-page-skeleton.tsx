import { cn } from "@/lib/utils";

/**
 * The shape an AP page holds while its data is in flight.
 *
 * Every screen in the panel is `force-dynamic`, so without a loading boundary
 * the browser sits on the previous page — nothing moves — until the server has
 * finished querying. A boundary lets Next paint this the instant a tab is
 * tapped and stream the real page in behind it, which is the whole difference
 * between "slow" and "instant" here.
 *
 * It is deliberately generic: a title, a few rows of surface. Anything more
 * specific would be wrong on most of the thirty screens that use it.
 */
export function ApPageSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full animate-pulse px-3 pb-6 pt-3 sm:px-4 md:px-5 xl:px-6", className)}
      aria-hidden
    >
      <div className="h-3 w-28 rounded-full bg-[var(--dcp-surface-3)]" />
      <div className="mt-3 h-[76px] rounded-[16px] bg-[var(--dcp-surface-3)]" />

      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[92px] rounded-[16px] bg-[var(--dcp-surface-2)]" />
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-[58px] rounded-[16px] bg-[var(--dcp-surface-2)]" />
        ))}
      </div>
    </div>
  );
}
