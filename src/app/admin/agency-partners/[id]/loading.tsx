export default function AgencyPartnerDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading partner detail">
      <div className="h-4 w-40 rounded-full bg-slate-200" />
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-64 rounded-2xl bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded-full bg-slate-100" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-h-[420px] rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded-full bg-slate-200" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-[280px] rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-slate-200" />
            <div className="h-20 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-24 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
