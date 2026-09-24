/**
 * The apply wizard's loading shape.
 *
 * This used to be a full-screen branded spinner, which is the slowest thing a
 * route can show: it covers the page, says nothing about what is coming, and
 * makes a one-second wait feel like five. A skeleton in the wizard's own shape
 * paints the moment the tab is tapped and the real page streams in behind it.
 */
export default function Loading() {
  return (
    <div data-dcp-page className="min-h-screen">
      <div className="mx-auto w-full max-w-4xl animate-pulse px-3 pb-6 pt-3 sm:px-4" aria-hidden>
        <div className="h-4 w-36 rounded-full bg-[var(--dcp-surface-3)]" />

        {/* Stepper */}
        <div className="mt-3 h-[46px] rounded-[14px] bg-[var(--dcp-surface-3)]" />

        {/* Search + filters */}
        <div className="dcp-card mt-2.5 space-y-2.5 p-3">
          <div className="h-10 rounded-xl bg-[var(--dcp-surface-2)]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-[var(--dcp-surface-2)]" />
            ))}
          </div>
        </div>

        {/* Service rows */}
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[84px] rounded-[14px] bg-[var(--dcp-surface-2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
