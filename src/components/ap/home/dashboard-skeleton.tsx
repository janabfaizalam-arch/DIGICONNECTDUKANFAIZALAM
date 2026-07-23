export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-5 pb-4 md:space-y-6" aria-hidden>
      {/* Banner: mobile 7:3, desktop 21:9 */}
      <div className="aspect-[7/3] w-full bg-slate-200/90 md:aspect-[21/9]" />

      {/* Quick actions */}
      <div className="space-y-2.5 px-4 md:px-6">
        <div className="h-3.5 w-24 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[72px] rounded-[16px] bg-slate-200/80" />
          ))}
        </div>
      </div>

      {/* Overview */}
      <div className="space-y-2.5 px-4 md:px-6">
        <div className="h-3.5 w-20 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[16px] bg-slate-100" />
          ))}
        </div>
      </div>

      {/* Pending / list placeholder */}
      <div className="space-y-2.5 px-4 md:px-6">
        <div className="h-3.5 w-28 rounded bg-slate-200" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[16px] bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
