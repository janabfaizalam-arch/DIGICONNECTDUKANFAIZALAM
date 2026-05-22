export default function ServicesLoading() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-72 rounded-[1.75rem] bg-blue-50" />
        <div className="flex gap-2 overflow-hidden">
          <div className="h-12 w-36 rounded-full bg-slate-100" />
          <div className="h-12 w-40 rounded-full bg-slate-100" />
          <div className="h-12 w-40 rounded-full bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="h-56 rounded-2xl bg-slate-100" />
          <div className="h-56 rounded-2xl bg-slate-100" />
          <div className="h-56 rounded-2xl bg-slate-100" />
          <div className="h-56 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}
