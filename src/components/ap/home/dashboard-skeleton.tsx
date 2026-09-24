/**
 * The home page's loading shape.
 *
 * Mirrors the real section order and heights — header, attention, banner,
 * actions, KPIs, charts — so the page does not jump when the data lands, and
 * uses the panel's own surfaces rather than grey blocks so the wait looks like
 * the product rather than a wireframe of it.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl animate-pulse space-y-4 px-4 pb-6 pt-3.5 md:px-6"
      aria-hidden
    >
      {/* Header */}
      <div className="h-[178px] rounded-[20px] bg-[var(--dcp-surface-3)] sm:h-[148px]" />

      {/* Banner: mobile 7:3, desktop 21:9 */}
      <div className="aspect-[7/3] w-full rounded-[16px] bg-[var(--dcp-surface-3)] md:aspect-[21/9]" />

      {/* Quick actions */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-[var(--dcp-surface-3)]" />
        <div className="flex gap-2.5 md:grid md:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[96px] w-[132px] shrink-0 rounded-[14px] bg-[var(--dcp-surface-2)] md:w-auto" />
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-[var(--dcp-surface-3)]" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[136px] rounded-[16px] bg-[var(--dcp-surface-2)]" />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full bg-[var(--dcp-surface-3)]" />
        <div className="grid gap-2.5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[236px] rounded-[16px] bg-[var(--dcp-surface-2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
