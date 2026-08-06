"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminDashboardPayload } from "@/lib/admin/dashboard-data";
import { formatInr } from "@/lib/admin/date-range";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#e11d48", "#0ea5e9"];

function ChartCard({
  title,
  subtitle,
  children,
  empty,
  compact,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label={title}>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p> : null}
      {empty ? (
        <p className="mt-8 text-center text-xs text-slate-500">No data for this range.</p>
      ) : (
        <div className={compact ? "mt-2 h-48" : "mt-2 h-56"}>{children}</div>
      )}
    </section>
  );
}

/** Above-the-fold funnel for the primary viewport. */
export function AdminDashboardPrimaryFunnel({
  funnel,
}: {
  funnel: AdminDashboardPayload["charts"]["funnel"];
}) {
  const hasData = funnel.some((f) => f.value > 0);
  const summary = funnel.map((f) => `${f.name}: ${f.value}`).join(", ");

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Lead / application funnel">
      <h2 className="text-sm font-bold text-slate-900">Lead / application funnel</h2>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">Leads into live application stages</p>
      {!hasData ? (
        <p className="mt-8 text-center text-xs text-slate-500">No data for this range.</p>
      ) : (
        <>
          <p className="sr-only">{summary}</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 18, left: 0, right: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="short"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  height={24}
                />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value) => [Number(value ?? 0).toLocaleString("en-IN"), "Count"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { name?: string } | undefined;
                    return row?.name ?? "";
                  }}
                />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={42}>
                  {funnel.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    className="fill-slate-700 text-[10px] font-bold"
                    formatter={(v) => (typeof v === "number" ? v.toLocaleString("en-IN") : String(v ?? ""))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-600">
            {funnel.map((entry, index) => (
              <li key={entry.name} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} aria-hidden />
                {entry.name}: {entry.value.toLocaleString("en-IN")}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function AdminDashboardCharts({
  charts,
  variant = "all",
}: {
  charts: AdminDashboardPayload["charts"];
  variant?: "all" | "secondary";
}) {
  const showFunnel = variant === "all";

  return (
    <section className="grid gap-3 xl:grid-cols-2" aria-label="Analytics charts">
      {showFunnel ? <AdminDashboardPrimaryFunnel funnel={charts.funnel} /> : null}

      <ChartCard title="Revenue trend (verified)" subtitle="Collected revenue over the selected range" empty={!charts.revenueTrend.length}>
        <p className="sr-only">
          {charts.revenueTrend.map((p) => `${p.label}: ${p.revenue}`).join(", ") || "No revenue points"}
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} width={56} />
            <Tooltip formatter={(value) => formatInr(Number(value ?? 0))} />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#059669"
              fill="#d1fae5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Applications trend" subtitle="Applications created per day" empty={!charts.applicationsTrend.length}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.applicationsTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="applications"
              name="Applications"
              stroke="#2563eb"
              fill="#dbeafe"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Service-wise performance" subtitle="Top services by application volume" empty={!charts.topServices.length}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.topServices} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="service" width={100} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Applications" fill="#2563eb" radius={[0, 6, 6, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Application status mix" empty={!charts.statusDistribution.length}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie data={charts.statusDistribution} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} isAnimationActive={false}>
              {charts.statusDistribution.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {charts.partnerPerformance ? (
        <ChartCard title="Partner workload" subtitle="Applications attributed to Digi Partners" empty={!charts.partnerPerformance.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.partnerPerformance} margin={{ bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="partner" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={52} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" name="Applications" fill="#7c3aed" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <ChartCard title="Partner workload" empty>
          <div />
        </ChartCard>
      )}
    </section>
  );
}
