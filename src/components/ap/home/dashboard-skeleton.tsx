/**
 * The home page's loading shape.
 *
 * Mirrors the real section order and heights — header, attention, banner,
 * actions, KPIs, charts — so the page does not jump when the data lands.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl animate-pulse space-y-5 px-4 pb-6 pt-4 md:space-y-6 md:px-6"
      aria-hidden
    >
      {/* Header */}
      <div className="h-[168px] rounded-[22px] bg-slate-200/90 sm:h-[150px]" />

      {/* Banner: mobile 7:3, desktop 21:9 */}
      <div className="aspect-[7/3] w-full rounded-[18px] bg-slate-200/80 md:aspect-[21/9]" />

      {/* Quick actions */}
      <div className="space-y-2.5">
        <div className="h-3.5 w-24 rounded bg-slate-200" />
        <div className="flex gap-2.5 md:grid md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[92px] w-[136px] shrink-0 rounded-[18px] bg-slate-200/80 md:w-auto" />
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="space-y-2.5">
        <div className="h-3.5 w-20 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[132px] rounded-[18px] bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-2.5">
        <div className="h-3.5 w-32 rounded bg-slate-200" />
        <div className="grid gap-2.5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[232px] rounded-[18px] bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
