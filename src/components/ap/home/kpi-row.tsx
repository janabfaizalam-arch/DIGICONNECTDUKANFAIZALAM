import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { PartnerKpi } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type KpiRowProps = {
  kpis: PartnerKpi[];
};

const TONE = {
  default: { rail: "bg-[#1268e8]", spark: "#1268e8" },
  success: { rail: "bg-[#0f9268]", spark: "#0f9268" },
  pending: { rail: "bg-[#c98500]", spark: "#c98500" },
  urgent: { rail: "bg-[#d1344a]", spark: "#d1344a" },
} as const;

const DELTA = {
  up: { Icon: ArrowUpRight, className: "text-[#0f7a57]" },
  down: { Icon: ArrowDownRight, className: "text-[#c22e42]" },
  flat: { Icon: Minus, className: "text-slate-500" },
} as const;

/**
 * A 12-point sparkline, drawn by hand rather than by a chart library.
 *
 * It is decoration for a number that is already written out beside it, so it
 * gets `aria-hidden` and no axes, no tooltip and no legend: a reader who
 * cannot see it loses nothing. Hand-rolled because pulling Recharts into the
 * server-rendered KPI row would make four tiles cost a client bundle.
 */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    // 2px of padding top and bottom so the stroke never clips at the extremes.
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-2 h-7 w-full"
      aria-hidden
      focusable="false"
    >
      <path d={area} fill={color} fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* End marker with a surface ring, so it stays legible over the line. */}
      <circle cx={lastX} cy={lastY} r={3.5} fill={color} stroke="#ffffff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * The four headline numbers.
 *
 * Four, not six: the old overview grid repeated figures that the earnings and
 * team panels below were already showing, so the page said the same thing
 * three times. Anything stated here is not restated further down.
 */
export function KpiRow({ kpis }: KpiRowProps) {
  if (!kpis.length) return null;

  return (
    <section aria-label="Key numbers" className="space-y-2.5">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900">Key numbers</h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {kpis.map((kpi) => {
          const tone = TONE[kpi.tone];
          const delta = kpi.delta ? DELTA[kpi.delta.tone] : null;

          return (
            <Link
              key={kpi.key}
              href={kpi.href}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-[18px] border border-slate-200/70 bg-white p-3.5",
                "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200",
                "hover:border-slate-300 hover:shadow-[0_10px_26px_-16px_rgba(15,23,42,0.3)]",
                "active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1268e8] focus-visible:ring-offset-2",
              )}
            >
              {/* Tone rail — a second, non-colour-only cue sits in the delta text. */}
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", tone.rail)} />

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>

              <p className="mt-1.5 truncate text-[22px] font-bold leading-none tracking-tight text-slate-950 lg:text-2xl">
                {kpi.value}
              </p>

              {kpi.delta && delta ? (
                <p className={cn("mt-1.5 flex items-center gap-1 text-[11px] font-bold", delta.className)}>
                  <delta.Icon className="h-3 w-3" aria-hidden />
                  {kpi.delta.label}
                  <span className="font-semibold text-slate-400">{kpi.delta.caption}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] font-semibold text-slate-400">&nbsp;</p>
              )}

              <Sparkline values={kpi.spark} color={tone.spark} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
