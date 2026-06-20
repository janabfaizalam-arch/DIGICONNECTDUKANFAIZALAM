// ============================================================
// Credit UI Component — Admin Dashboard (Analytics & Tables)
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React, { useState, useEffect } from "react";
import { Search, Eye, Download, Users, Landmark, AlertCircle, BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCreditDate } from "@/lib/credit/constants";
import type { CreditAdminAnalytics } from "@/lib/credit/types";

interface CreditAdminDashboardProps {
  initialAnalytics: CreditAdminAnalytics;
}

export function CreditAdminDashboard({ initialAnalytics }: CreditAdminDashboardProps) {
  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch reports on filter change
  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) queryParams.set("search", search);
      if (status !== "all") queryParams.set("status", status);

      const res = await fetch(`/api/admin/credit-reports?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReports(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load admin credit reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search, status, page]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6 text-white">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-black/40 backdrop-blur-md">
          <div className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-white/50 block font-medium">Total Credit Checks</span>
              <span className="text-3xl font-extrabold tracking-tight">{initialAnalytics.totalChecks}</span>
            </div>
            <Users className="w-10 h-10 text-white/20" />
          </div>
        </Card>

        <Card className="border-white/10 bg-black/40 backdrop-blur-md">
          <div className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-white/50 block font-medium">Total Revenue</span>
              <span className="text-3xl font-extrabold tracking-tight">₹{initialAnalytics.totalRevenue}</span>
            </div>
            <Landmark className="w-10 h-10 text-white/20" />
          </div>
        </Card>

        <Card className="border-white/10 bg-black/40 backdrop-blur-md">
          <div className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-white/50 block font-medium">Average Credit Score</span>
              <span className="text-3xl font-extrabold tracking-tight">{initialAnalytics.avgScore}</span>
            </div>
            <BarChart3 className="w-10 h-10 text-white/20" />
          </div>
        </Card>

        <Card className="border-white/10 bg-black/40 backdrop-blur-md">
          <div className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-white/50 block font-medium">Failed Queries</span>
              <span className="text-3xl font-extrabold tracking-tight">{initialAnalytics.failedRequests}</span>
            </div>
            <AlertCircle className="w-10 h-10 text-white/20" />
          </div>
        </Card>
      </div>

      {/* 2. Filters section */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-black/30 border border-white/10 p-4 rounded-xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search by name, mobile, PAN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border-white/10 text-white placeholder-white/40 pl-9 h-10"
          />
        </div>

        <Select
          value={status}
          onValueChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white h-10">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="payment_pending">Payment Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 3. Reports Table */}
      <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-b border-white/10">
              <TableHead className="text-white font-semibold">User Info</TableHead>
              <TableHead className="text-white font-semibold">PAN (Masked)</TableHead>
              <TableHead className="text-white font-semibold">Bureau</TableHead>
              <TableHead className="text-white font-semibold">Score</TableHead>
              <TableHead className="text-white font-semibold">Package</TableHead>
              <TableHead className="text-white font-semibold">Status</TableHead>
              <TableHead className="text-white font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-white/50">
                  Loading reports database records...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-white/50">
                  No credit score checks found matching filters.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const isExpanded = expandedRow === report.id;
                const isCompleted = report.status === "completed";
                const isFailed = report.status === "failed";
                
                let statusColor = "bg-yellow-500/10 text-yellow-400";
                if (isCompleted) statusColor = "bg-emerald-500/10 text-emerald-400";
                if (isFailed) statusColor = "bg-red-500/10 text-red-400";

                return (
                  <React.Fragment key={report.id}>
                    <TableRow className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="font-semibold">{report.full_name}</div>
                        <div className="text-white/40 text-[10px]">{report.mobile} | Checked {formatCreditDate(report.created_at)}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs tracking-wider text-white/80">{report.pan}</TableCell>
                      <TableCell className="text-white/70">{report.bureau_name || "—"}</TableCell>
                      <TableCell className="font-bold">{report.credit_score || "—"}</TableCell>
                      <TableCell className="text-white/60 capitalize text-xs">{report.package_type.replace("_", " ")}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${statusColor}`}>
                          {report.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedRow(isExpanded ? null : report.id)}
                            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                            title="Audit Response"
                          >
                            <Database className="w-4 h-4" />
                          </Button>
                          {isCompleted && report.report_pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/api/credit/download?id=${report.id}`, "_blank")}
                              className="h-8 w-8 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row showing raw JSON response (Audit and troubleshooting) */}
                    {isExpanded && (
                      <TableRow className="bg-white/5 border-b border-white/5">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              Raw API JSON Audit Response
                            </h4>
                            <pre className="text-[10px] font-mono bg-black/60 p-4 rounded-lg overflow-x-auto text-emerald-400 border border-white/5 max-h-72">
                              {JSON.stringify(report.response_json || { info: "No raw API response data available." }, null, 2)}
                            </pre>
                            {report.error_message && (
                              <div className="text-xs text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-500/10">
                                <span className="font-semibold block">Failed Request Error Log:</span>
                                {report.error_message}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-white/5">
            <span className="text-xs text-white/40">Showing page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="default"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="default"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="border-white/10 hover:bg-white/5 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
