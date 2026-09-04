"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { compactInr, nearestPoint, trendGeometry, type TrendPoint } from "@/lib/admin/trend-chart";
import { cn } from "@/lib/utils";

/**
 * One line, one axis, one question.
 *
 * Applications and revenue are both here, and deliberately never at the same
 * time: they have nothing in common but a date, and putting two scales on one
 * pair of axes is the fastest way to make a chart that says whatever the
 * reader already believed. A toggle keeps one measure, one axis, and no legend
 * to decode.
 *
 * Drawn as plain SVG. A charting library on the screen an agent opens forty
 * times a day is a lot of JavaScript for one line; the arithmetic lives in
 * trend-chart.ts and is tested.
 */

export type TrendSeries = {
  id: string;
  label: string;
  points: TrendPoint[];
  colour: string;
  /** Format for the axis and the tooltip. */
  money?: boolean;
};

const WIDTH = 640;
const HEIGHT = 168;

export function AdminTrendChart({ series }: { series: TrendSeries[] }) {
  const gradientId = useId();
  const still = useReducedMotion();
  const [activeId, setActiveId] = useState(series[0]?.id ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const active = series.find((item) => item.id === activeId) ?? series[0];
  const geometry = useMemo(
    () => (active ? trendGeometry(active.points, { width: WIDTH, height: HEIGHT }) : null),
    [active],
  );

  if (!active) return null;

  const format = (value: number) => (active.money ? compactInr(value) : value.toLocaleString("en-IN"));
  const point = hover !== null && geometry ? geometry.points[hover] : null;

  const track = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry || !svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    // The SVG scales to its container, so the pointer has to be mapped back
    // into the coordinate space the geometry was computed in.
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    setHover(nearestPoint(geometry.points, x));
  };

  return (
    <section className="lg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[14px] font-extrabold text-[var(--dc-ink)]">How the work is trending</h2>
          <p className="mt-0.5 text-[11.5px] font-medium text-[var(--dc-body)]">
            {point ? `${point.label} · ${format(point.value)}` : `${active.label} across the period`}
          </p>
        </div>

        {series.length > 1 ? (
          <div
            role="tablist"
            aria-label="What to chart"
            className="flex gap-1 rounded-full bg-[var(--dc-sky-soft)] p-1"
          >
            {series.map((item) => {
              const on = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setActiveId(item.id);
                    setHover(null);
                  }}
                  className={cn(
                    "h-8 rounded-full px-3 text-[12px] font-bold transition",
                    on ? "text-white shadow-sm" : "text-[var(--dc-body)] hover:text-[var(--dc-ink)]",
                  )}
                  style={on ? { background: item.colour } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {geometry ? (
        <div className="relative mt-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[168px] w-full touch-none"
            role="img"
            aria-label={`${active.label}: ${active.points
              .map((p) => `${p.label} ${format(p.value)}`)
              .join(", ")}`}
            onPointerMove={track}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active.colour} stopOpacity="0.24" />
                <stop offset="100%" stopColor={active.colour} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Recessive grid: present enough to read a value against, quiet
                enough that the line is the thing you see. */}
            {geometry.ticks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={28}
                  x2={WIDTH - 8}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-[var(--dc-ink)]/8"
                />
                <text
                  x={24}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  className="fill-[var(--dc-body)] text-[9px] font-bold"
                >
                  {format(tick.value)}
                </text>
              </g>
            ))}

            <path d={geometry.area} fill={`url(#${gradientId})`} />
            {/*
              Drawn in, not faded in.

              pathLength is framer-motion's own — it measures the path rather
              than guessing a dash length, which is what a hand-rolled
              strokeDasharray does and gets wrong the moment the series
              changes length.
            */}
            <motion.path
              key={`${active.id}-${geometry.points.length}`}
              d={geometry.line}
              fill="none"
              stroke={active.colour}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={still ? false : { pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />

            {point ? (
              <>
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={8}
                  y2={HEIGHT - 18}
                  stroke={active.colour}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                <circle cx={point.x} cy={point.y} r={5} fill="white" stroke={active.colour} strokeWidth={2.5} />
              </>
            ) : null}

            {/* Only the ends are labelled: a date under every point is a row of
                text nobody reads, and on a phone they overlap. */}
            {geometry.points.length > 1 ? (
              <>
                <text
                  x={geometry.points[0].x}
                  y={HEIGHT - 4}
                  textAnchor="start"
                  className="fill-[var(--dc-body)] text-[9.5px] font-bold"
                >
                  {geometry.points[0].label}
                </text>
                <text
                  x={geometry.points[geometry.points.length - 1].x}
                  y={HEIGHT - 4}
                  textAnchor="end"
                  className="fill-[var(--dc-body)] text-[9.5px] font-bold"
                >
                  {geometry.points[geometry.points.length - 1].label}
                </text>
              </>
            ) : null}
          </svg>
        </div>
      ) : (
        <p className="py-10 text-center text-[12.5px] font-medium text-[var(--dc-body)]">
          Nothing recorded in this period yet.
        </p>
      )}
    </section>
  );
}
