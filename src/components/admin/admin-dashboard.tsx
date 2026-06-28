"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ClipboardList,
  FileClock,
  IndianRupee,
  Search,
  TrendingUp,
  UsersRound,
  RefreshCw,
  Database,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DashboardKpi = {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  href: string;
  icon: "application" | "pending" | "completed" | "customers" | "revenue" | "wallet" | "growth" | "conversion";
};

export type DashboardApplicationRow = {
  id: string;
  customerName: string;
  mobile: string;
  service: string;
  status: string;
  paymentStatus: string;
  assignedAgent: string;
  date: string;
  href: string;
};

export type DashboardCustomerRow = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  walletBalance: string;
  cashbackBalance: string;
  applicationsCount: number;
  joinedDate: string;
  href: string;
};

export type DashboardQuotationRow = {
  id: string;
  customerName: string;
  vehicleNumber: string;
  totalAmount: string;
  status: string;
  validTill: string;
  href: string;
};

export type DashboardChartData = {
  workflow: { label: string; applications: number }[];
  revenue: { label: string; revenue: number }[];
  statuses: { name: string; value: number }[];
  services: { service: string; count: number }[];
  partnerGrowth: { label: string; partners: number }[];
};

type AdminDashboardProps = {
  todayLabel: string;
  kpis: DashboardKpi[];
  charts: DashboardChartData;
  newApplications: DashboardApplicationRow[];
  latestCustomers: DashboardCustomerRow[];
  recentInsuranceQuotations: DashboardQuotationRow[];
  error?: string;
};

const iconMap = {
  application: ClipboardList,
  pending: FileClock,
  completed: TrendingUp,
  customers: UsersRound,
  revenue: IndianRupee,
  wallet: Layers,
  growth: Activity,
  conversion: CheckCircle,
};

const statusColors = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899"];

function money(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(safeValue).toLocaleString("en-IN")}`;
}

export function AdminDashboard({
  todayLabel,
  kpis,
  charts,
  newApplications,
  latestCustomers,
  recentInsuranceQuotations,
  error,
}: AdminDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
  }, []);

  const triggerRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    }, 900);
  };

  const skeleton = (
    <div className="w-full space-y-4">
      <div className="glass-skeleton h-6 w-1/3" />
      <div className="glass-skeleton h-12 w-full" />
      <div className="glass-skeleton h-4 w-1/2" />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Title / Banner */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/75 backdrop-blur-xl p-6 shadow-xs relative overflow-hidden glass-liquid-premium">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/40 rounded-full blur-3xl pointer-events-none" />
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                DS-OS V3 Core
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Database className="h-3 w-3" /> Data Source: Supabase Realtime
              </span>
            </div>
            <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900 font-heading">Control Dashboard</h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Checked {todayLabel} · Updated at {lastUpdated}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={triggerRefresh}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition active:scale-98"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-500", loading && "animate-spin")} />
              Sync Engine
            </button>
            <form action="/admin/applications" className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                id="global-search-input"
                placeholder="Global search..."
                className="h-11 rounded-xl border-slate-200 pl-11 shadow-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-xs transition"
              />
            </form>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="mt-6 flex flex-wrap gap-2.5 border-t border-slate-100 pt-5">
          <Link
            href="/admin/agency-partners/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-98"
          >
            Onboard Partner
          </Link>
          <Link
            href="/admin/customers/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-98"
          >
            Create Customer
          </Link>
          <Link
            href="/admin/applications"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-98"
          >
            New Application
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = iconMap[kpi.icon];
          return (
            <Link
              key={kpi.title}
              href={kpi.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-sm flex flex-col justify-between glass-liquid-premium"
            >
              {loading ? (
                skeleton
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.title}</p>
                      <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 font-heading">
                        {kpi.value}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> API: Live
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        kpi.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      )}
                    >
                      {kpi.isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {kpi.change}
                    </span>
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </section>

      {/* Analytics Charts */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Revenue Trend Area Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between glass-liquid-premium min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading">Revenue Trend</h2>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updated
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Verified and completed payouts, last 7 days</p>
          </div>
          <div className="mt-5 h-64 w-full">
            {loading ? (
              <div className="glass-skeleton h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.workflow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0/60" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(255,255,255,0.9)", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
                    labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#1e293b" }}
                  />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#3b82f6" fill="url(#revenueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Application Volume Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between glass-liquid-premium min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading">Filing Volumes</h2>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Application submissions trend, last 7 days</p>
          </div>
          <div className="mt-5 h-64 w-full">
            {loading ? (
              <div className="glass-skeleton h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0/60" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val) => money(Number(val))}
                    contentStyle={{ background: "rgba(255,255,255,0.9)", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between glass-liquid-premium min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading">Application Funnel</h2>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Accurate
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Status distribution breakdown</p>
          </div>
          <div className="mt-5 h-64 w-full flex items-center justify-center">
            {loading ? (
              <div className="glass-skeleton h-full w-full" />
            ) : charts.statuses.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.statuses} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                    {charts.statuses.map((entry, index) => (
                      <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState title="No status data" description="Status splits will populate when applications land." />
            )}
          </div>
        </div>

        {/* Service Performance Horizontal Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between glass-liquid-premium min-h-[360px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading">Service Performance</h2>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Top requested services from clients</p>
          </div>
          <div className="mt-5 h-64 w-full">
            {loading ? (
              <div className="glass-skeleton h-full w-full" />
            ) : charts.services.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.services} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <CartesianGrid stroke="#e2e8f0/60" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis dataKey="service" type="category" width={90} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Submissions" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState title="No demand statistics" description="Will show counts once services are submitted." />
            )}
          </div>
        </div>
      </section>

      {/* Grid of Actionable CRM Lists */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Recent Applications Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs glass-liquid-premium">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">Recent Submissions</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Workflow Assignments console</p>
            </div>
            <Link href="/admin/applications" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                <div className="glass-skeleton h-8 w-full" />
                <div className="glass-skeleton h-8 w-full" />
                <div className="glass-skeleton h-8 w-full" />
              </div>
            ) : newApplications.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-400">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Service</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-slate-900 text-xs">{app.customerName}</p>
                        <p className="font-mono text-[9px] text-slate-400">{app.mobile}</p>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 truncate max-w-44">
                        {app.service}
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={app.href}
                          className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AdminEmptyState title="No filings logged" description="Latest partner filings will appear in this ledger." />
            )}
          </div>
        </div>

        {/* Latest Customers Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs glass-liquid-premium">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">Registered Customers</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">360 profiles log</p>
            </div>
            <Link href="/admin/customers" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                <div className="glass-skeleton h-8 w-full" />
                <div className="glass-skeleton h-8 w-full" />
                <div className="glass-skeleton h-8 w-full" />
              </div>
            ) : latestCustomers.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-400">Name</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Wallet</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Apps</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestCustomers.map((cust) => (
                    <TableRow key={cust.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-slate-900 text-xs">{cust.name}</p>
                        <p className="font-mono text-[9px] text-slate-400">{cust.mobile || cust.email}</p>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">
                        {cust.walletBalance}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">
                        {cust.applicationsCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={cust.href}
                          className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AdminEmptyState title="No customer profiles" description="New customer signups list is currently empty." />
            )}
          </div>
        </div>

        {/* Recent Insurance Quotations Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs glass-liquid-premium xl:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">Recent Insurance Quotations</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Insurance calculations tracker</p>
            </div>
            <Link href="/admin/insurance-quotations" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3">
                <div className="glass-skeleton h-8 w-full" />
                <div className="glass-skeleton h-8 w-full" />
              </div>
            ) : recentInsuranceQuotations.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-400">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Vehicle</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400 text-right">Premium</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400">Expiry</TableHead>
                    <TableHead className="text-xs font-bold text-slate-400 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInsuranceQuotations.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {quote.customerName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 uppercase">
                        {quote.vehicleNumber}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 text-right">
                        {quote.totalAmount}
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {quote.validTill}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={quote.href}
                          className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <AdminEmptyState title="No insurance quotes" description="Recent calculations ledger is empty." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
