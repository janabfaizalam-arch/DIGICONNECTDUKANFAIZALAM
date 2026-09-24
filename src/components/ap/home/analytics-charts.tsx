"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_APPLICATIONS,
  CHART_AXIS_TEXT,
  CHART_COLLECTION,
  CHART_GRID,
  CHART_MARK,
  CHART_OTHER,
  CHART_RANKED_BAR,
} from "@/lib/ap/chart-theme";
import { formatCount, formatINR } from "@/lib/ap/format";
import type { PartnerServiceMixItem, PartnerTrendPoint } from "@/lib/ap/home-types";

/**
 * The Recharts half of the analytics block, in its own module so it can be
 * loaded on demand.
 *
 * Recharts is the single heaviest thing on this route. Splitting it out lets
 * the header, the attention strip, the quick actions, the KPI row and the
 * status bar — all of which need no charting code — paint and become clickable
 * while it is still arriving.
 */

type TooltipRow = { label: string; value: string };

function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
      <p className="text-[11px] font-bold text-slate-900">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="mt-0.5 text-[11px] font-medium text-slate-600">
          {row.label}: <span className="font-bold tabular-nums text-slate-900">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Collection over time — money, so it gets its own chart.
 *
 * Applications live in a separate chart below rather than on a second y-axis:
 * two scales on one plot make the crossings look meaningful when they are an
 * artefact of the scaling.
 */
export function CollectionTrend({ points }: { points: PartnerTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_AXIS_TEXT, fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={{ stroke: CHART_GRID }}
          interval="preserveStartEnd"
          minTickGap={18}
        />
        <YAxis
          tick={{ fill: CHART_AXIS_TEXT, fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          width={58}
          tickFormatter={(value: number) => formatINR(value, { compact: true })}
        />
        <Tooltip
          cursor={{ stroke: CHART_AXIS_TEXT, strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as PartnerTrendPoint;
            return <ChartTooltip title={point.label} rows={[{ label: "Collected", value: formatINR(point.collection) }]} />;
          }}
        />
        <Area
          type="monotone"
          dataKey="collection"
          stroke={CHART_COLLECTION}
          strokeWidth={CHART_MARK.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={CHART_COLLECTION}
          fillOpacity={CHART_MARK.areaOpacity}
          dot={false}
          activeDot={{
            r: CHART_MARK.dotRadius,
            fill: CHART_COLLECTION,
            stroke: "#ffffff",
            strokeWidth: CHART_MARK.dotRingWidth,
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Applications per day — a count, so columns from a zero baseline. */
export function ApplicationsTrend({ points }: { points: PartnerTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={points} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_AXIS_TEXT, fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={{ stroke: CHART_GRID }}
          interval="preserveStartEnd"
          minTickGap={18}
        />
        <YAxis
          tick={{ fill: CHART_AXIS_TEXT, fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as PartnerTrendPoint;
            return (
              <ChartTooltip title={point.label} rows={[{ label: "Applications", value: formatCount(point.applications) }]} />
            );
          }}
        />
        <Bar
          dataKey="applications"
          fill={CHART_APPLICATIONS}
          radius={CHART_MARK.barRadiusVertical}
          maxBarSize={CHART_MARK.maxBarSize}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Top services, ranked.
 *
 * One flat hue for every bar: colouring them by rank would make the hue mean
 * "position", which changes whenever the ranking does. The folded "Other" row
 * is the one exception and wears an achromatic grey, because it is explicitly
 * not a category.
 */
export function ServiceMix({ items }: { items: PartnerServiceMixItem[] }) {
  const height = Math.max(120, items.length * 34 + 16);

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
          {/* No gridlines: the value axis is hidden and every bar is directly
              labelled, so a grid would be ink that carries nothing. */}
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={118}
            interval={0}
            tickFormatter={(name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as PartnerServiceMixItem;
              return (
                <ChartTooltip
                  title={item.name}
                  rows={[
                    { label: "Applications", value: formatCount(item.applications) },
                    { label: "Collected", value: formatINR(item.amount) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="applications"
            radius={CHART_MARK.barRadiusHorizontal}
            maxBarSize={CHART_MARK.maxBarSize}
            isAnimationActive={false}
            label={{
              position: "right",
              fontSize: 11,
              fontWeight: 700,
              fill: "#0f172a",
              formatter: (value: unknown) => formatCount(value),
            }}
          >
            {items.map((item) => (
              <Cell key={item.name} fill={item.name === "Other" ? CHART_OTHER : CHART_RANKED_BAR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* The chart's values in text, for anyone the plot does not reach. */}
      <table className="sr-only">
        <caption>Applications and collection by service</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Applications</th>
            <th scope="col">Collected</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <th scope="row">{item.name}</th>
              <td>{formatCount(item.applications)}</td>
              <td>{formatINR(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
