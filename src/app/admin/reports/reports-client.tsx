"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Download, Search, Landmark, User, FileText, BadgePercent, Wallet, Layers, Activity } from "lucide-react";
import { AdminEmptyState, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeCurrency } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import type { ReportApplicationItem, ReportPartnerItem } from "./page";

type ReportType = "revenue" | "partners" | "branches" | "services" | "wallet" | "commissions";

export function ReportsClient({
  applications,
  partners,
  stats,
}: {
  applications: ReportApplicationItem[];
  partners: ReportPartnerItem[];
  stats: {
    totalRevenue: number;
    totalCommissions: number;
    totalWalletLiability: number;
    totalCashbackIssued: number;
  };
}) {
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const districts = useMemo(() => {
    const list = new Set(partners.map((p) => p.district).filter(Boolean));
    return Array.from(list);
  }, [partners]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.customerName.toLowerCase().includes(search.toLowerCase()) ||
        app.serviceName.toLowerCase().includes(search.toLowerCase()) ||
        app.partnerName.toLowerCase().includes(search.toLowerCase()) ||
        app.partnerCode.toLowerCase().includes(search.toLowerCase());

      const matchesBranch = branchFilter === "all" || app.district === branchFilter;

      const matchesDate = (() => {
        if (dateFilter === "all") return true;
        const appDate = new Date(app.createdAt).getTime();
        const now = Date.now();
        if (dateFilter === "today") return now - appDate < 24 * 60 * 60 * 1000;
        if (dateFilter === "7d") return now - appDate < 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === "30d") return now - appDate < 30 * 24 * 60 * 60 * 1000;
        return true;
      })();

      return matchesSearch && matchesBranch && matchesDate;
    });
  }, [applications, search, branchFilter, dateFilter]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.partnerCode.toLowerCase().includes(search.toLowerCase());
      const matchesBranch = branchFilter === "all" || p.district === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [partners, search, branchFilter]);

  // Aggregate values for graphs
  const chartData = useMemo(() => {
    // 1. Group applications counts
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const workflowMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = daysOfWeek[d.getDay()];
      workflowMap.set(label, 0);
      revenueMap.set(label, 0);
    }

    filteredApps.forEach((app) => {
      const label = daysOfWeek[new Date(app.createdAt).getDay()];
      if (workflowMap.has(label)) {
        workflowMap.set(label, (workflowMap.get(label) ?? 0) + 1);
        workflowMap.set(label, (revenueMap.get(label) ?? 0) + app.amount);
      }
    });

    const workflow = Array.from(workflowMap.entries()).map(([label, val]) => ({ label, applications: val })).reverse();
    const revenue = Array.from(revenueMap.entries()).map(([label, val]) => ({ label, revenue: val })).reverse();

    // 2. Service Demand
    const serviceCounts: Record<string, number> = {};
    filteredApps.forEach((app) => {
      serviceCounts[app.serviceName] = (serviceCounts[app.serviceName] ?? 0) + 1;
    });
    const services = Object.entries(serviceCounts)
      .map(([service, count]) => ({ name: service, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      workflow,
      revenue,
      services,
    };
  }, [filteredApps]);

  const downloadCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === "revenue") {
      headers = ["Application ID", "Customer Name", "Service", "Partner", "Partner Code", "Amount", "Payment Status", "District", "Created Date"];
      rows = filteredApps.map((a) => [a.id, a.customerName, a.serviceName, a.partnerName, a.partnerCode, String(a.amount), a.paymentStatus, a.district, a.createdAt]);
    } else if (reportType === "partners") {
      headers = ["Partner Name", "Partner Code", "State", "District", "Total Applications", "Total Revenue", "Commissions Paid"];
      rows = filteredPartners.map((p) => [p.name, p.partnerCode, p.state, p.district, String(p.appCount), String(p.revenue), String(p.commission)]);
    } else {
      headers = ["District Branch", "Total Revenue", "Total Filings", "Active Partners"];
      const branchSummary: Record<string, { rev: number; count: number; partners: number }> = {};
      filteredPartners.forEach((p) => {
        branchSummary[p.district] ??= { rev: 0, count: 0, partners: 0 };
        branchSummary[p.district].rev += p.revenue;
        branchSummary[p.district].count += p.appCount;
        branchSummary[p.district].partners += 1;
      });
      headers = ["Branch District", "Revenue", "Applications", "Partners count"];
      rows = Object.entries(branchSummary).map(([branch, meta]) => [branch, String(meta.rev), String(meta.count), String(meta.partners)]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-operations-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Financial stats cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total Revenue" value={safeCurrency(stats.totalRevenue)} icon={Wallet} tone="blue" />
        <AdminStatCard title="Payout Settled" value={safeCurrency(stats.totalCommissions)} icon={BadgePercent} tone="green" />
        <AdminStatCard title="Wallet liability" value={safeCurrency(stats.totalWalletLiability)} icon={Layers} tone="orange" />
        <AdminStatCard title="Cashback Issued" value={safeCurrency(stats.totalCashbackIssued)} icon={Activity} tone="slate" />
      </div>

      {/* Reports selector tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {[
          { key: "revenue", label: "Revenue Reports", icon: Wallet },
          { key: "partners", label: "Partner Reports", icon: User },
          { key: "branches", label: "Branch Reports", icon: Landmark },
          { key: "services", label: "Service Reports", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key as ReportType)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
                reportType === tab.key
                  ? "bg-blue-50 text-blue-700 shadow-xs border border-blue-100"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {/* Main report console details */}
        <Card className="p-4 md:p-6 overflow-hidden glass-liquid-premium">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search report logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl min-w-[9rem] bg-white border-slate-200">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-10 text-xs rounded-xl min-w-[9rem] bg-white border-slate-200">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={downloadCsv}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 text-xs font-bold text-white shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-xs"
              >
                Print
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            {reportType === "revenue" && (
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Filing fee</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-900 text-xs">{a.customerName}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 truncate max-w-44">{a.serviceName}</TableCell>
                      <TableCell className="text-xs text-slate-500">{a.district}</TableCell>
                      <TableCell>
                        <p className="font-bold text-xs text-slate-700">{a.partnerName}</p>
                        <p className="font-mono text-[9px] text-slate-400">{a.partnerCode}</p>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-800 text-right">{safeCurrency(a.amount)}</TableCell>
                      <TableCell><span className="text-[10px] font-bold uppercase">{a.paymentStatus}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {reportType === "partners" && (
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Commission settled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-slate-950 text-xs">{p.name}</p>
                        <p className="font-mono text-[9px] text-indigo-600">{p.partnerCode}</p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.district}, {p.state}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-800 text-right">{p.appCount}</TableCell>
                      <TableCell className="text-xs font-bold text-blue-600 text-right">{safeCurrency(p.revenue)}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600 text-right">{safeCurrency(p.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {reportType === "branches" && (
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <TableRow>
                    <TableHead>State / District Branch</TableHead>
                    <TableHead className="text-right">Partner Density</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districts.map((d) => {
                    const branchParts = filteredPartners.filter((p) => p.district === d);
                    const rev = branchParts.reduce((sum, p) => sum + p.revenue, 0);
                    const appsCount = branchParts.reduce((sum, p) => sum + p.appCount, 0);
                    return (
                      <TableRow key={d} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-950 text-xs">{d}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 text-right">{branchParts.length} partner(s)</TableCell>
                        <TableCell className="text-xs font-bold text-slate-800 text-right">{appsCount}</TableCell>
                        <TableCell className="text-xs font-bold text-blue-600 text-right">{safeCurrency(rev)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {reportType === "services" && (
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead className="text-right">Filings Count</TableHead>
                    <TableHead className="text-right">Revenue share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.services.map((s) => {
                    const rev = filteredApps.filter((a) => a.serviceName === s.name).reduce((sum, a) => sum + a.amount, 0);
                    return (
                      <TableRow key={s.name} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-950 text-xs">{s.name}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-800 text-right">{s.value}</TableCell>
                        <TableCell className="text-xs font-bold text-blue-600 text-right">{safeCurrency(rev)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        {/* Right side charts */}
        <div className="space-y-4">
          <Card className="p-5 border border-slate-200 bg-white shadow-xs glass-liquid-premium flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Revenue Splits</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Filings workflow revenue, last 7 days</p>
            </div>
            <div className="h-56 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.workflow} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="reportsRevenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0/60" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="url(#reportsRevenueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 bg-white shadow-xs glass-liquid-premium flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Service splits</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Filing count distribution</p>
            </div>
            <div className="h-56 mt-4 w-full flex items-center justify-center">
              {chartData.services.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.services} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {chartData.services.map((entry, index) => (
                        <Cell key={entry.name} fill={["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#06b6d4"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <AdminEmptyState title="No metrics" description="No filings logged." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
