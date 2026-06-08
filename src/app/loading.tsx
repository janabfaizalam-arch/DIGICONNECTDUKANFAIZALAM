export default function Loading() {
  return (
    <div className="min-h-screen bg-white pt-20 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Hero skeleton */}
        <div className="glass-skeleton h-48 md:h-72 w-full rounded-2xl" />

        {/* Search skeleton */}
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="glass-skeleton h-14 w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-skeleton h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Categories skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-skeleton h-28 rounded-2xl" />
          ))}
        </div>

        {/* Featured skeleton */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-skeleton h-52 w-64 shrink-0 rounded-2xl" />
          ))}
        </div>

        {/* Content sections */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-skeleton h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
