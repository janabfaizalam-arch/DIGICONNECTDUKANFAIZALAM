"use client";

import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, FileClock, GalleryHorizontalEnd, IndianRupee, Search, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";

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
  icon: "application" | "pending" | "completed" | "customers" | "revenue" | "quotation";
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
  referralCount: number;
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
  quotation: ShieldCheck,
};

const statusColors = ["#2563eb", "#f97316", "#0f766e", "#64748b", "#38bdf8", "#fb923c"];

function money(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `Rs ${Math.round(safeValue).toLocaleString("en-IN")}`;
}

function DashboardCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const Icon = iconMap[kpi.icon];

  return (
    <Link href={kpi.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
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

function ApplicationsTable({ rows }: { rows: DashboardApplicationRow[] }) {
  return (
    <DashboardCard>
      <h2 className="text-base font-bold text-slate-950">New Applications</h2>
      <div className="mt-4">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="hidden lg:table-cell">Payment</TableHead>
                <TableHead className="hidden xl:table-cell">Agent</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="truncate font-bold text-slate-950">{row.customerName || "Customer"}</p>
                    <div className="mt-1 sm:hidden"><AdminStatusBadge status={row.status} /></div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-slate-500 md:table-cell">{row.mobile || "-"}</TableCell>
                  <TableCell>
                    <p className="max-w-[12rem] truncate text-sm text-slate-600">{row.service || "Service"}</p>
                    <div className="mt-1 hidden sm:block"><AdminStatusBadge status={row.status} /></div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><AdminStatusBadge status={row.paymentStatus || "pending"} /></TableCell>
                  <TableCell className="hidden text-sm text-slate-600 xl:table-cell">{row.assignedAgent || "-"}</TableCell>
                  <TableCell className="hidden text-xs text-slate-500 sm:table-cell">{row.date}</TableCell>
                  <TableCell className="text-right">
                    <Link href={row.href} className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState title="No applications yet" description="Customer applications will appear here after submission." />
        )}
      </div>
    </DashboardCard>
  );
}

function CustomersTable({ rows }: { rows: DashboardCustomerRow[] }) {
  return (
    <DashboardCard>
      <h2 className="text-base font-bold text-slate-950">Customers</h2>
      <div className="mt-4">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Mobile</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden xl:table-cell">Wallet</TableHead>
                <TableHead>Apps</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-bold text-slate-950">{row.name || "Customer"}</p>
                    <p className="mt-1 text-xs text-slate-500 xl:hidden">{row.walletBalance} wallet | {row.cashbackBalance} cashback</p>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-slate-500 md:table-cell">{row.mobile || "-"}</TableCell>
                  <TableCell className="hidden text-sm text-slate-600 lg:table-cell">{row.email || "-"}</TableCell>
                  <TableCell className="hidden text-sm font-bold text-slate-800 xl:table-cell">{row.walletBalance} / {row.cashbackBalance}</TableCell>
                  <TableCell className="text-sm font-bold text-slate-800">{row.applicationsCount}</TableCell>
                  <TableCell className="hidden text-xs text-slate-500 sm:table-cell">{row.joinedDate}</TableCell>
                  <TableCell className="text-right">
                    <Link href={row.href} className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState title="No customers yet" description="Signed-up customers will appear here." />
        )}
      </div>
    </DashboardCard>
  );
}

function QuotationsTable({ rows }: { rows: DashboardQuotationRow[] }) {
  return (
    <DashboardCard>
      <h2 className="text-base font-bold text-slate-950">Recent Insurance Quotations</h2>
      <div className="mt-4">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="hidden md:table-cell">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Valid Till</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-bold text-slate-950">{row.customerName || "Customer"}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{row.vehicleNumber || "-"}</TableCell>
                  <TableCell className="hidden text-sm font-bold text-slate-800 md:table-cell">{row.totalAmount}</TableCell>
                  <TableCell><AdminStatusBadge status={row.status} /></TableCell>
                  <TableCell className="hidden text-xs text-slate-500 sm:table-cell">{row.validTill}</TableCell>
                  <TableCell className="text-right">
                    <Link href={row.href} className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState title="No insurance quotations yet" description="Created insurance quotes will appear here." />
        )}
      </div>
    </DashboardCard>
  );
}

export function AdminDashboard({ todayLabel, kpis, charts, newApplications, latestCustomers, recentInsuranceQuotations, error }: AdminDashboardProps) {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Admin</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">Admin Control Room</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{todayLabel}</p>
          </div>
          <form action="/admin/applications" className="w-full xl:w-[28rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="q" placeholder="Search customer, application, service, mobile number" className="h-12 rounded-2xl border-slate-200 pl-11 shadow-none" />
            </div>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/applications" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
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

      {error ? <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.title} kpi={kpi} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardCard>
          <ChartTitle title="Applications" description="Last 7 days submitted applications" />
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.workflow}>
                <defs>
                  <linearGradient id="applicationFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
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
                    {charts.statuses.map((entry, index) => <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />)}
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
        <ApplicationsTable rows={newApplications} />
        <CustomersTable rows={latestCustomers} />
        <QuotationsTable rows={recentInsuranceQuotations} />
      </section>
    </div>
  );
}
