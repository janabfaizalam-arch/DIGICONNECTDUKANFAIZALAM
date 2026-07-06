"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, Download, Landmark, ArrowUpRight, Users, Wallet } from "lucide-react";
import { AdminEmptyState, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeCurrency } from "@/lib/admin-format";
import type { BranchMetrics } from "./page";

type SortOption = "revenue-high" | "partners-high" | "conversion-high" | "name-az";

export function BranchesClient({ initialBranches }: { initialBranches: BranchMetrics[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("revenue-high");

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialBranches
      .filter((b) => b.state.toLowerCase().includes(query) || b.district.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "partners-high") return b.partnerCount - a.partnerCount;
        if (sort === "conversion-high") return b.conversionRate - a.conversionRate;
        if (sort === "name-az") return `${a.state} ${a.district}`.localeCompare(`${b.state} ${b.district}`);
        return b.totalRevenue - a.totalRevenue;
      });
  }, [initialBranches, search, sort]);

  const kpis = useMemo(() => {
    const totalRevenue = initialBranches.reduce((sum, b) => sum + b.totalRevenue, 0);
    const totalPartners = initialBranches.reduce((sum, b) => sum + b.partnerCount, 0);
    const sorted = [...initialBranches].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topBranch = sorted[0]?.district || "None";
    
    return {
      totalBranches: initialBranches.length,
      topBranch,
      totalPartners,
      totalRevenue,
    };
  }, [initialBranches]);

  // Aggregate data for the chart (top 6 branches by revenue)
  const chartData = useMemo(() => {
    return [...filteredBranches]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 6)
      .map((b) => ({
        name: b.district,
        revenue: b.totalRevenue,
      }));
  }, [filteredBranches]);

  const downloadCsv = () => {
    const headers = [
      "State",
      "Branch / District",
      "Total Partners",
      "Active Partners",
      "Total Applications",
      "Pending Applications",
      "Completed Applications",
      "Total Revenue",
      "Avg Commission",
      "Conversion Rate (%)"
    ];
    
    const csvContent = [
      headers.join(","),
      ...filteredBranches.map((b) => [
        `"${b.state.replace(/"/g, '""')}"`,
        `"${b.district.replace(/"/g, '""')}"`,
        b.partnerCount,
        b.activePartners,
        b.totalApplications,
        b.pendingApplications,
        b.completedApplications,
        b.totalRevenue,
        b.avgCommission,
        `${b.conversionRate}%`
      ].join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `regional-branches-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Regional Branches" value={kpis.totalBranches} icon={Landmark} tone="blue" />
        <AdminStatCard title="Top Branch" value={kpis.topBranch} icon={ArrowUpRight} tone="orange" />
        <AdminStatCard title="Network Partners" value={kpis.totalPartners} icon={Users} tone="green" />
        <AdminStatCard title="Network Revenue" value={safeCurrency(kpis.totalRevenue)} icon={Wallet} tone="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {/* Branch List Table */}
        <Card className="p-4 md:p-6 overflow-hidden glass-liquid-premium">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter by state or district name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Select value={sort} onValueChange={(val) => setSort(val as SortOption)}>
                <SelectTrigger className="h-10 text-xs rounded-xl min-w-[12rem] bg-white border-slate-200">
                  <SelectValue placeholder="Sort branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue-high">Sort by Revenue</SelectItem>
                  <SelectItem value="partners-high">Sort by Partner Count</SelectItem>
                  <SelectItem value="conversion-high">Sort by Conversion Rate</SelectItem>
                  <SelectItem value="name-az">Sort A-Z</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={downloadCsv}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 text-xs font-bold text-white shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            {filteredBranches.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <TableRow>
                    <TableHead>Location (State/District)</TableHead>
                    <TableHead>Partners (Active/Total)</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Comm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((b) => (
                    <TableRow key={`${b.state}-${b.district}`} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-slate-900 text-xs">{b.district}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.state}</p>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        {b.activePartners} / {b.partnerCount} active
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 text-right">
                        {b.totalApplications} ({b.pendingApplications} pending)
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 text-right">
                        {b.conversionRate}%
                      </TableCell>
                      <TableCell className="text-xs font-bold text-blue-600 text-right">
                        {safeCurrency(b.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600 text-right">
                        {safeCurrency(b.avgCommission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8">
                <AdminEmptyState title="No regional records" description="No branches match the location filters." />
              </div>
            )}
          </div>
        </Card>

        {/* Right Side: Charts */}
        <div className="space-y-4">
          <Card className="p-5 border border-slate-200 bg-white shadow-xs glass-liquid-premium flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenues per Branch</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Top 6 branches by revenue</p>
            </div>
            <div className="h-56 mt-4 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                    <CartesianGrid stroke="#e2e8f0/60" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }} />
                    <YAxis tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                    <Tooltip formatter={(val) => safeCurrency(Number(val))} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <AdminEmptyState title="No chart data" description="Demand is currently low." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
