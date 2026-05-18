import { SkeletonCard } from "@/components/ui/loading";

export default function AdminApplicationsLoading() {
  return (
    <div className="mx-auto max-w-[96rem] space-y-6">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/80 p-7 shadow-sm">
        <div className="h-4 w-44 rounded-full bg-slate-200 motion-safe:animate-pulse" />
        <div className="mt-4 h-12 w-72 max-w-full rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-slate-200 motion-safe:animate-pulse" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <SkeletonCard key={index} rows={2} />
        ))}
      </section>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-11 w-full rounded-2xl bg-slate-200 motion-safe:animate-pulse" />
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}
