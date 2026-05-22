export default function CustomerDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f8fbff] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl animate-pulse space-y-4">
        <div className="h-44 rounded-[1.5rem] bg-white shadow-sm" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <div className="h-24 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
          <div className="h-24 rounded-2xl bg-white" />
        </div>
        <div className="h-28 rounded-[1.5rem] bg-white" />
        <div className="space-y-2 rounded-[1.5rem] bg-white p-4">
          <div className="h-9 w-56 rounded-full bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}
