"use client";

import Link from "next/link";
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
import {
  ClipboardList,
  FileClock,
  GalleryHorizontalEnd,
  IndianRupee,
  Inbox,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DashboardKpi = {
  title: string;
  value: string | number;
  trend: string;
  href: string;
  icon: "lead" | "application" | "pending" | "completed" | "revenue" | "payment";
};

export type DashboardTableRow = {
  id: string;
  customerName: string;
  mobile: string;
  service: string;
  status: string;
  date: string;
  href: string;
};

export type DashboardChartData = {
  workflow: { label: string; leads: number; applications: number }[];
  revenue: { label: string; revenue: number }[];
  statuses: { name: string; value: number }[];
  services: { service: string; count: number }[];
};

type AdminDashboardProps = {
  todayLabel: string;
  kpis: DashboardKpi[];
  charts: DashboardChartData;
  recentLeads: DashboardTableRow[];
  recentApplications: DashboardTableRow[];
  pendingPayments: DashboardTableRow[];
  recentInsuranceQuotations: DashboardTableRow[];
  error?: string;
};

const iconMap = {
  lead: Inbox,
  application: ClipboardList,
  pending: FileClock,
  completed: TrendingUp,
  revenue: IndianRupee,
  payment: ReceiptText,
};

const statusColors = ["#2563eb", "#f97316", "#0f766e", "#64748b", "#38bdf8", "#fb923c"];

function money(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function DashboardCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const Icon = iconMap[kpi.icon];

  return (
    <Link
      href={kpi.href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-500">{kpi.title}</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{kpi.value}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 text-blue-700 transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-bold text-orange-600">{kpi.trend}</p>
    </Link>
  );
}

function ChartTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DataTable({ title, rows, emptyTitle, emptyDescription }: { title: string; rows: DashboardTableRow[]; emptyTitle: string; emptyDescription: string }) {
  return (
    <DashboardCard>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
      </div>
      <div className="mt-4">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{row.customerName}</p>
                      <div className="mt-1 sm:hidden">
                        <AdminStatusBadge status={row.status} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-slate-500 md:table-cell">{row.mobile || "No mobile"}</TableCell>
                  <TableCell>
                    <p className="max-w-[12rem] truncate text-sm text-slate-600">{row.service}</p>
                    <div className="mt-1 hidden sm:block">
                      <AdminStatusBadge status={row.status} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-slate-500 sm:table-cell">{row.date}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={row.href}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </DashboardCard>
  );
}

export function AdminDashboard({
  todayLabel,
  kpis,
  charts,
  recentLeads,
  recentApplications,
  pendingPayments,
  recentInsuranceQuotations,
  error,
}: AdminDashboardProps) {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Admin</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Admin Control Room</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{todayLabel}</p>
          </div>
          <form action="/admin/leads" className="w-full xl:w-[28rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                placeholder="Search lead, customer, application, mobile number"
                className="h-12 rounded-2xl border-slate-200 pl-11 shadow-none"
              />
            </div>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/leads" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
          <Link href="/admin/applications" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
            <ClipboardList className="h-4 w-4" />
            New Application
          </Link>
          <Link href="/admin/insurance-quotations" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
            <ShieldCheck className="h-4 w-4" />
            New Insurance Quote
          </Link>
          <Link href="/admin/gallery" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
            <GalleryHorizontalEnd className="h-4 w-4" />
            Upload Gallery
          </Link>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} kpi={kpi} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardCard>
          <ChartTitle title="Leads vs Applications" description="Last 7 days workflow demand" />
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.workflow}>
                <defs>
                  <linearGradient id="leadFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="applicationFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#2563eb" fill="url(#leadFill)" strokeWidth={3} />
                <Area type="monotone" dataKey="applications" stroke="#f97316" fill="url(#applicationFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard>
          <ChartTitle title="Revenue Estimate" description="Verified or completed work, last 7 days" />
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenue}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard>
          <ChartTitle title="Application Status" description="Current status mix" />
          <div className="mt-5 h-72">
            {charts.statuses.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.statuses} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                    {charts.statuses.map((entry, index) => (
                      <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState title="No applications yet" description="Status analytics will appear after applications arrive." />
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <ChartTitle title="Top Requested Services" description="Most requested services from applications" />
          <div className="mt-5 h-72">
            {charts.services.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.services} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis dataKey="service" type="category" width={120} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState title="No service data" description="Service demand will appear after applications arrive." />
            )}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-5 2xl:grid-cols-2">
        <DataTable title="Recent Leads" rows={recentLeads} emptyTitle="No leads yet" emptyDescription="New website enquiries will appear here." />
        <DataTable
          title="Recent Applications"
          rows={recentApplications}
          emptyTitle="No applications yet"
          emptyDescription="Customer applications will appear here after submission."
        />
        <DataTable
          title="Pending Payments"
          rows={pendingPayments}
          emptyTitle="No pending payments"
          emptyDescription="Pending payment follow-ups will appear here."
        />
        <DataTable
          title="Recent Insurance Quotations"
          rows={recentInsuranceQuotations}
          emptyTitle="No insurance quotations yet"
          emptyDescription="Created insurance quotes will appear here."
        />
      </section>
    </div>
  );
}
