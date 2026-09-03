import { Activity, Eye, MapPin, MonitorSmartphone, Radio, Users } from "lucide-react";

import type { DayPoint, Tally, VisitSummary } from "@/lib/analytics/summarise";

/**
 * The site's own traffic, drawn without a chart library.
 *
 * One measure — visits — so there is one hue and no legend: colour carries no
 * identity here, it is just the mark. Every bar is labelled with its own
 * number and its own day, which on fourteen points is more useful than a
 * tooltip nobody hovers on a phone.
 */

const INK = "text-slate-900";
const MUTED = "text-slate-500";
const BAR = "#0f5db8";
/** Tallest bar, in pixels. Every other day is scaled against the busiest. */
const PLOT_HEIGHT = 120;

function nf(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function SiteAnalytics({ summary }: { summary: VisitSummary }) {
  const empty = summary.month.views === 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Radio className="h-4 w-4" />}
          label="On the site now"
          value={nf(summary.now)}
          hint="Different people in the last 30 minutes"
          live
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="People today"
          value={nf(summary.today.visitors)}
          hint={`${nf(summary.today.views)} pages opened`}
        />
        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="People this week"
          value={nf(summary.week.visitors)}
          hint={`${nf(summary.week.views)} pages opened`}
        />
        <Stat
          icon={<Eye className="h-4 w-4" />}
          label="Pages per visit"
          value={summary.pagesPerVisit ? summary.pagesPerVisit.toFixed(1) : "—"}
          hint="Over the last 30 days"
        />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className={`text-sm font-bold ${INK}`}>Nothing counted yet</p>
          <p className={`mx-auto mt-1 max-w-md text-[13px] font-medium ${MUTED}`}>
            Visits start appearing here the moment somebody opens the site after this was deployed.
            Nothing from before then exists — this is the site&rsquo;s own counting, not an import.
          </p>
        </div>
      ) : null}

      <DailyBars points={summary.days} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Where they came from"
          note="Counted once per visit, at the page they landed on"
          rows={summary.sources}
          empty="No arrivals counted yet."
        />
        <BarList
          title="Pages they opened"
          note="Last 30 days"
          rows={summary.pages}
          empty="No pages counted yet."
          mono
        />
        <BarList
          title="Pages they landed on first"
          note="Which link or poster is working"
          rows={summary.entryPages}
          empty="No landings counted yet."
          mono
        />
        <div className="grid gap-4">
          <BarList
            title="Towns"
            note="From the CDN, so district-level at best"
            rows={summary.cities}
            empty="No location reported yet. Locally there is none to report."
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
          <BarList
            title="Phone or computer"
            note="Last 30 days"
            rows={summary.devices}
            empty="Nothing counted yet."
            icon={<MonitorSmartphone className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function Stat({
  icon,
  label,
  value,
  hint,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] ${MUTED}`}>
        <span className={live ? "text-emerald-600" : "text-slate-400"}>{icon}</span>
        {label}
      </p>
      <p className={`mt-1.5 text-[28px] font-black leading-none ${INK}`}>{value}</p>
      <p className={`mt-1.5 text-[11.5px] font-semibold ${MUTED}`}>{hint}</p>
    </div>
  );
}

/**
 * Fourteen days, one bar each.
 *
 * Bars rather than a line because a day is a bucket, not a point on a
 * continuum, and because an empty day should read as an empty day rather than
 * as a line sagging through it.
 */
function DailyBars({ points }: { points: DayPoint[] }) {
  const peak = Math.max(1, ...points.map((point) => point.visitors));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`text-[13.5px] font-black ${INK}`}>People per day</h2>
        <p className={`text-[11.5px] font-semibold ${MUTED}`}>Last 14 days · busiest {nf(peak)}</p>
      </div>

      {/*
        Heights in pixels, not percentages.

        A percentage height resolves against the parent's height, and the
        parent here is a flex column sized by its own content — so every bar
        computed to zero and the chart rendered as fourteen numbers floating
        above fourteen dates. Measured in a browser, not guessed at.
      */}
      <div className="mt-4 flex items-end gap-1.5 sm:gap-2">
        {points.map((point) => {
          const height = Math.round((point.visitors / peak) * PLOT_HEIGHT);
          return (
            <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className={`text-[10.5px] font-bold tabular-nums ${point.visitors ? INK : "text-slate-300"}`}>
                {point.visitors || ""}
              </span>
              <div
                className="w-full shrink-0 rounded-t-[4px]"
                style={{
                  height: `${Math.max(point.visitors ? 6 : 3, height)}px`,
                  background: point.visitors ? BAR : "#e2e8f0",
                }}
                title={`${dayLabel(point.day)}: ${nf(point.visitors)} people, ${nf(point.views)} pages`}
              />
              <span className={`truncate text-[9.5px] font-semibold ${MUTED}`}>{dayLabel(point.day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarList({
  title,
  note,
  rows,
  empty,
  mono,
  icon,
}: {
  title: string;
  note: string;
  rows: Tally[];
  empty: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  const peak = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`flex items-center gap-1.5 text-[13.5px] font-black ${INK}`}>
          {icon ? <span className="text-slate-400">{icon}</span> : null}
          {title}
        </h2>
        <p className={`text-[11px] font-semibold ${MUTED}`}>{note}</p>
      </div>

      {rows.length === 0 ? (
        <p className={`mt-3 text-[12.5px] font-medium ${MUTED}`}>{empty}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`min-w-0 flex-1 truncate text-[12.5px] font-bold ${INK} ${mono ? "font-mono" : ""}`}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span className={`shrink-0 text-[12.5px] font-black tabular-nums ${INK}`}>{nf(row.count)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(3, Math.round((row.count / peak) * 100))}%`, background: BAR }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
