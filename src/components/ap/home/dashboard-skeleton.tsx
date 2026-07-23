export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="aspect-[21/9] w-full bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
