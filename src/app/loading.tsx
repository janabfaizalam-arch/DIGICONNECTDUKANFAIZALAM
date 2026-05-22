export default function RootLoading() {
  return (
    <main className="min-h-[42vh] px-4 py-8 md:px-8" role="status" aria-label="Loading page">
      <div className="container-shell">
        <div className="h-1 w-full overflow-hidden rounded-full bg-blue-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-700 to-orange-500 motion-safe:animate-[loading-slide_1.15s_ease-in-out_infinite]" />
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border bg-white/80 p-5 shadow-sm">
            <div className="h-5 w-28 rounded-full bg-slate-100 motion-safe:animate-pulse" />
            <div className="mt-4 h-8 w-3/4 rounded-xl bg-slate-100 motion-safe:animate-pulse" />
            <div className="mt-3 h-4 w-full rounded-full bg-slate-100 motion-safe:animate-pulse" />
          </div>
          <div className="rounded-2xl border bg-white/65 p-5 shadow-sm">
            <div className="h-24 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
