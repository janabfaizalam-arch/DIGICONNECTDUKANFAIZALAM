"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { STATUS_BUCKET_COLOR } from "@/lib/ap/chart-theme";
import { describeStatusMix } from "@/lib/ap/home-analytics";
import { formatCount, formatINR } from "@/lib/ap/format";
import type { PartnerAnalytics } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";
import { cn } from "@/lib/utils";

/**
 * Recharts arrives on demand.
 *
 * It is the heaviest dependency on this route, and nothing above it on the
 * page needs it — the header, attention strip, quick actions, KPI row and the
 * status bar below are all plain markup. Splitting it out lets all of that
 * paint and become clickable first; the placeholders hold the charts' exact
 * final height meanwhile, so nothing shifts when it lands.
 */
const chartLoading = () => <div className="h-[190px] animate-pulse rounded-xl bg-[var(--dcp-surface-3)]" aria-hidden />;

const CollectionTrend = dynamic(
  () => import("@/components/ap/home/analytics-charts").then((m) => m.CollectionTrend),
  { loading: chartLoading },
);
const ApplicationsTrend = dynamic(
  () => import("@/components/ap/home/analytics-charts").then((m) => m.ApplicationsTrend),
  { loading: chartLoading },
);
const ServiceMix = dynamic(
  () => import("@/components/ap/home/analytics-charts").then((m) => m.ServiceMix),
  { loading: () => <div className="h-[150px] animate-pulse rounded-xl bg-[var(--dcp-surface-3)]" aria-hidden /> },
);

type AnalyticsPanelProps = {
  analytics: PartnerAnalytics;
  className?: string;
};

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 14, label: "14 days" },
] as const;

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dcp-card dcp-solid p-3">
      <p className="dcp-h2">{title}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[var(--dcp-ink-3)]">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * Where every application currently stands, as one proportional bar.
 *
 * Segments are separated by a 2px gap in the surface colour rather than a
 * stroke, and each one is named in the legend below with its count — so state
 * never depends on telling two fills apart. Plain markup, no charting library.
 */
function StatusMix({ analytics }: { analytics: PartnerAnalytics }) {
  const total = analytics.statusMix.reduce((sum, item) => sum + item.count, 0);

  if (!total) {
    return <DashboardEmptyState title="Nothing to plot yet" description="Status appears once you have applications." />;
  }

  return (
    <div>
      <div
        className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={describeStatusMix(analytics.statusMix)}
      >
        {analytics.statusMix.map((item) => (
          <span
            key={item.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.count / total) * 100}%`,
              backgroundColor: STATUS_BUCKET_COLOR[item.key],
            }}
          />
        ))}
      </div>

      {/* One row per state: swatch, name, share and count. The swatch alone
          never carries identity — the name is always beside it. */}
      <ul className="mt-4 space-y-2.5">
        {analytics.statusMix.map((item) => {
          const share = Math.round((item.count / total) * 100);
          return (
            <li key={item.key} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_BUCKET_COLOR[item.key] }}
              />
              <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-[var(--dcp-ink-2)]">
                {item.label}
              </span>
              <span aria-hidden className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--dcp-surface-3)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${share}%`, backgroundColor: STATUS_BUCKET_COLOR[item.key] }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--dcp-ink-4)]">
                {share}%
              </span>
              <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-[var(--dcp-ink)]">
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The analytics block: two trend charts, a service ranking and a status bar.
 *
 * The range control sits in one row above the charts and slices data that is
 * already on the client, so switching 14 days to 7 is instant and costs no
 * request.
 */
export function AnalyticsPanel({ analytics, className }: AnalyticsPanelProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>(14);

  const points = useMemo(() => analytics.trend.slice(-range), [analytics.trend, range]);

  const totals = useMemo(
    () => ({
      applications: points.reduce((sum, p) => sum + p.applications, 0),
      collection: points.reduce((sum, p) => sum + p.collection, 0),
    }),
    [points],
  );

  if (analytics.isEmpty) {
    return (
      <section aria-label="Business analytics" className={cn("space-y-2", className)}>
        <h2 className="dcp-h2">Business analytics</h2>
        <DashboardEmptyState
          title="Charts appear after your first application"
          description="Collection, service mix and status trends all build from the applications you submit."
        />
      </section>
    );
  }

  return (
    <section aria-label="Business analytics" className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="dcp-h2">Business analytics</h2>

        <div className="inline-flex rounded-[11px] border border-[var(--dcp-line)] bg-[var(--dcp-surface)] p-0.5 shadow-[var(--dcp-e1)]" role="group" aria-label="Chart range">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={range === option.key}
              onClick={() => setRange(option.key)}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-[11px] font-bold transition duration-150",
                range === option.key
                  ? "text-white shadow-[0_5px_14px_-7px_rgba(18,104,232,0.85)] [background-image:var(--dcp-g-brand)]"
                  : "text-[var(--dcp-ink-2)] hover:bg-[var(--dcp-surface-2)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel title="Collection" subtitle={`${formatINR(totals.collection)} over the last ${range} days`}>
          <CollectionTrend points={points} />
        </Panel>

        <Panel title="Applications" subtitle={`${formatCount(totals.applications)} submitted in the last ${range} days`}>
          <ApplicationsTrend points={points} />
        </Panel>

        <Panel title="Top services" subtitle={`By applications in the last ${analytics.rangeDays} days`}>
          {analytics.serviceMix.length ? (
            <ServiceMix items={analytics.serviceMix} />
          ) : (
            <DashboardEmptyState title="No services yet" description="Your service mix appears here." />
          )}
        </Panel>

        <Panel title="Status of all applications" subtitle={describeStatusMix(analytics.statusMix)}>
          <StatusMix analytics={analytics} />
        </Panel>
      </div>
    </section>
  );
}
