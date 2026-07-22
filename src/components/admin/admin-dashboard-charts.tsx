"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminDashboardPayload } from "@/lib/admin/dashboard-data";
import { formatInr } from "@/lib/admin/date-range";

const COLORS = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#64748b"];

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {empty ? <p className="mt-8 text-center text-xs text-slate-500">No data for this range.</p> : <div className="mt-3 h-64">{children}</div>}
    </section>
  );
}

export function AdminDashboardCharts({ charts }: { charts: AdminDashboardPayload["charts"] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Applications trend" empty={!charts.applicationsTrend.length}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.applicationsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="applications" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue trend (verified)" empty={!charts.revenueTrend.length}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
            <Tooltip formatter={(value) => formatInr(Number(value ?? 0))} />
            <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#d1fae5" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Application status distribution" empty={!charts.statusDistribution.length}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={charts.statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} isAnimationActive={false}>
              {charts.statusDistribution.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top services by applications" empty={!charts.topServices.length}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.topServices} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="service" width={110} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {charts.partnerPerformance ? (
        <ChartCard title="Digi Partner performance" empty={!charts.partnerPerformance.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.partnerPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="partner" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="applications" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </section>
  );
}
