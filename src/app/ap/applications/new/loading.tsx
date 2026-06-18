export default function NewAPApplicationLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 px-4 py-6 md:px-8 md:py-10 pb-28">
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        {/* Back link skeleton */}
        <div className="h-8 w-32 bg-slate-200 rounded-full shadow-sm" />

        {/* Sticky Header Skeleton */}
        <div className="bg-white border border-slate-100 px-6 py-4 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-64 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-slate-100 rounded-full" />
            <div className="h-8 w-24 bg-slate-100 rounded-full" />
          </div>
        </div>

        {/* Form Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Step Wizard Skeletons */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-150" />
                  <div className="space-y-1">
                    <div className="h-4 w-36 bg-slate-200 rounded-md" />
                    <div className="h-2 w-24 bg-slate-100 rounded-sm" />
                  </div>
                </div>
                <div className="h-6 w-32 bg-slate-100 rounded-lg" />
              </div>

              <div className="h-10 w-full bg-slate-150 rounded-xl" />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><div className="h-3 w-16 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                <div className="space-y-1"><div className="h-3 w-20 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                <div className="space-y-1"><div className="h-3 w-16 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><div className="h-3 w-12 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                  <div className="space-y-1"><div className="h-3 w-16 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                </div>
                <div className="space-y-1"><div className="h-3 w-14 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><div className="h-3 w-12 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                  <div className="space-y-1"><div className="h-3 w-12 bg-slate-100 rounded-sm" /><div className="h-10 w-full bg-slate-100 rounded-xl" /></div>
                </div>
                <div className="space-y-1 md:col-span-2"><div className="h-3 w-24 bg-slate-100 rounded-sm" /><div className="h-16 w-full bg-slate-100 rounded-xl" /></div>
              </div>
            </div>
          </div>

          {/* Right Summary Panel Skeleton */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="h-5 w-32 bg-slate-200 rounded-md border-b border-slate-100 pb-3" />
              <div className="space-y-2">
                <div className="flex justify-between"><div className="h-3.5 w-24 bg-slate-100 rounded-sm" /><div className="h-3.5 w-16 bg-slate-150 rounded-sm" /></div>
                <div className="flex justify-between"><div className="h-3.5 w-20 bg-slate-100 rounded-sm" /><div className="h-3.5 w-20 bg-slate-150 rounded-sm" /></div>
                <div className="flex justify-between"><div className="h-3.5 w-24 bg-slate-100 rounded-sm" /><div className="h-3.5 w-12 bg-slate-150 rounded-sm" /></div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded-sm" />
                <div className="h-3 w-2/3 bg-slate-100 rounded-sm" />
                <div className="h-4 w-1/2 bg-slate-200 rounded-md mt-2" />
              </div>
              <div className="h-10 w-full bg-slate-100 rounded-xl" />
              <div className="h-12 w-full bg-slate-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
