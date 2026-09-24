import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BadgeIndianRupee, FileStack, Layers, Wallet } from "lucide-react";

import type { PartnerKpi } from "@/lib/ap/home-types";
import { cn } from "@/lib/utils";

type KpiRowProps = {
  kpis: PartnerKpi[];
  className?: string;
};

/** Each KPI's own hue, so the four tiles read as four things, not one grid. */
const TONE = {
  default: { ink: "var(--dcp-brand)", grad: "var(--dcp-g-brand)", soft: "var(--dcp-brand-soft)" },
  success: { ink: "var(--dcp-good)", grad: "var(--dcp-g-good)", soft: "var(--dcp-good-soft)" },
  pending: { ink: "var(--dcp-warn)", grad: "linear-gradient(135deg,#B37600 0%,#E9A61F 100%)", soft: "var(--dcp-warn-soft)" },
  urgent: { ink: "var(--dcp-bad)", grad: "linear-gradient(135deg,#B62B3E 0%,#E8556B 100%)", soft: "var(--dcp-bad-soft)" },
} as const;

const ICONS = {
  "today-collection": Wallet,
  "today-applications": FileStack,
  "open-work": Layers,
  "commission-earned": BadgeIndianRupee,
} as const;

const DELTA = {
  up: { Icon: ArrowUpRight, className: "text-[var(--dcp-good)]" },
  down: { Icon: ArrowDownRight, className: "text-[var(--dcp-bad)]" },
  flat: { Icon: null, className: "text-[var(--dcp-ink-3)]" },
} as const;

/**
 * A 12-point sparkline, drawn by hand rather than by a chart library.
 *
 * Decoration for a number already written out beside it, so it is
 * `aria-hidden` and carries no axes, tooltip or legend — a reader who cannot
 * see it loses nothing. Hand-rolled because pulling Recharts into the
 * server-rendered KPI row would make four tiles cost a client bundle.
 *
 * A flat series is the case worth designing for: a new partner sees all
 * zeroes, and a dead straight line pinned to the floor looks like a rendering
 * bug. A flat run is drawn on the baseline as a dashed rule instead.
 */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 26;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min;

  if (flat) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[26px] w-full" aria-hidden focusable="false">
        <line
          x1="0"
          y1={height - 6}
          x2={width}
          y2={height - 6}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="3 5"
          strokeLinecap="round"
          opacity={0.45}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const span = max - min;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    // 3px of padding top and bottom so the stroke never clips at the extremes.
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[26px] w-full" aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.26} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
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
 * Four, not six: the old overview grid repeated figures the earnings and team
 * panels below were already showing, so the page said the same thing three
 * times. Anything stated here is not restated further down.
 */
export function KpiRow({ kpis, className }: KpiRowProps) {
  if (!kpis.length) return null;

  return (
    <section aria-label="Key numbers" className={cn("space-y-2", className)}>
      <h2 className="dcp-h2">Key numbers</h2>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const tone = TONE[kpi.tone];
          const delta = kpi.delta ? DELTA[kpi.delta.tone] : null;
          const Icon = ICONS[kpi.key as keyof typeof ICONS] ?? Wallet;

          return (
            <Link
              key={kpi.key}
              href={kpi.href}
              className="dcp-card dcp-card-link group relative flex flex-col overflow-hidden p-3"
            >
              {/* A faint wash of the tile's own hue, so the four read apart. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-[0.5] blur-2xl transition-opacity duration-300 group-hover:opacity-80"
                style={{ background: tone.soft }}
              />

              <div className="relative flex items-start justify-between gap-2">
                <p className="text-[9.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[var(--dcp-ink-3)]">
                  {kpi.label}
                </p>
                <span
                  aria-hidden
                  className="dcp-chip h-7 w-7 shrink-0 text-white"
                  style={{ backgroundImage: tone.grad }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>

              <p className="relative mt-1.5 truncate text-[21px] font-bold leading-none tracking-[-0.02em] text-[var(--dcp-ink)]">
                {kpi.value}
              </p>

              {kpi.delta && delta ? (
                <p className={cn("relative mt-1 flex items-center gap-1 text-[10.5px] font-bold", delta.className)}>
                  {delta.Icon ? <delta.Icon className="h-3 w-3" aria-hidden /> : null}
                  {kpi.delta.label}
                  <span className="font-medium text-[var(--dcp-ink-4)]">{kpi.delta.caption}</span>
                </p>
              ) : (
                <p className="relative mt-1 text-[10.5px] font-medium text-[var(--dcp-ink-4)]">&nbsp;</p>
              )}

              <div className="relative mt-1.5">
                <Sparkline values={kpi.spark} color={tone.ink} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
