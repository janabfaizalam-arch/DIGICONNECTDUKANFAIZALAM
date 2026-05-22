export default function AboutLoading() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-72 rounded-[1.75rem] bg-blue-50" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-36 rounded-2xl bg-slate-100" />
          <div className="h-36 rounded-2xl bg-slate-100" />
          <div className="h-36 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}
