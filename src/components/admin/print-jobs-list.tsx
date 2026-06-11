"use client";

import React, { useState } from "react";
import { 
  Printer, 
  Search, 
  RefreshCw, 
  Eye,
  ChevronDown,
  ChevronUp,
  User,
  Activity
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { safeDateTime } from "@/lib/admin-format";

type LogEntry = {
  id: string;
  action: string;
  actor: string;
  details: unknown;
  created_at: string;
};

type FileEntry = {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
};

type PrintJob = {
  id: string;
  job_number: string;
  customer_mobile: string;
  copies: number;
  pages: number;
  paper_size: string;
  color_mode: string;
  price: number;
  payment_status: string;
  print_status: string;
  created_at: string;
  print_job_files?: FileEntry[];
  print_job_logs?: LogEntry[];
};

type PrintJobsListProps = {
  initialJobs: PrintJob[];
};

export function PrintJobsList({ initialJobs }: PrintJobsListProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [jobs, setJobs] = useState<PrintJob[]>(initialJobs);
  const [search, setSearch] = useState("");
  const [printFilter, setPrintFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh data from server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/print/jobs/status?job_id=");
      // Let's reload the page to get server components to refetch fresh data
      window.location.reload();
      toastSuccess("Print jobs list updated.");
    } catch (err) {
      console.error("Refresh failed:", err);
      toastError("Failed to update print jobs list.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger Reprint
  const handleReprint = async (jobId: string) => {
    setLoadingJobId(jobId);
    try {
      const res = await fetch("/api/print/jobs/reprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger reprint");

      toastSuccess(data.message || "Print job queued for reprint!");
      // Update local status to queued
      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? { ...job, print_status: "queued", claimed_by: null }
            : job
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request reprint";
      toastError(msg);
    } finally {
      setLoadingJobId(null);
    }
  };

  // Secure File Download/View
  const handleDownloadFile = async (jobId: string) => {
    try {
      const res = await fetch("/api/print/jobs/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get signed link");

      // Open signed link in new window
      window.open(data.signed_url, "_blank");
      toastSuccess("Opening file in new secure tab...");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve print file";
      toastError(msg);
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.job_number.toLowerCase().includes(search.toLowerCase()) ||
      job.customer_mobile.includes(search);

    const matchesPrint =
      printFilter === "all" || job.print_status === printFilter;

    const matchesPayment =
      paymentFilter === "all" || job.payment_status === paymentFilter;

    return matchesSearch && matchesPrint && matchesPayment;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search job number or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={printFilter}
            onChange={(e) => setPrintFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
          >
            <option value="all">All Print Status</option>
            <option value="queued">Queued</option>
            <option value="printing">Printing</option>
            <option value="printed">Printed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified (Paid)</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Lists
        </button>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 w-12"></th>
                <th className="py-4 px-4">Job Number</th>
                <th className="py-4 px-4">Mobile</th>
                <th className="py-4 px-4">Parameters</th>
                <th className="py-4 px-4">Price</th>
                <th className="py-4 px-4">Payment</th>
                <th className="py-4 px-4">Print Status</th>
                <th className="py-4 px-4">File Name</th>
                <th className="py-4 px-4">Created At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.map((job) => {
                const jobFile = job.print_job_files?.[0];
                const isExpanded = expandedJobId === job.id;
                const isFileExpired = !jobFile;

                return (
                  <React.Fragment key={job.id}>
                    <tr className={`hover:bg-slate-50/50 ${isExpanded ? "bg-slate-50/30" : ""}`}>
                      {/* Accordion Trigger */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleExpand(job.id)}
                          className="text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>

                      {/* Job Number */}
                      <td className="py-4 px-4 font-bold text-slate-900">{job.job_number}</td>

                      {/* Customer Mobile */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">{job.customer_mobile}</td>

                      {/* Config parameters */}
                      <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                        {job.copies} copy ({job.paper_size}, {job.color_mode === "mono" ? "B&W" : "Color"}, {job.pages} pgs)
                      </td>

                      {/* Pricing */}
                      <td className="py-4 px-4 font-extrabold text-blue-600">₹{Number(job.price).toFixed(2)}</td>

                      {/* Payment */}
                      <td className="py-4 px-4">
                        <AdminStatusBadge status={job.payment_status} />
                      </td>

                      {/* Print Status */}
                      <td className="py-4 px-4">
                        <AdminStatusBadge status={job.print_status} />
                      </td>

                      {/* File Info */}
                      <td className="py-4 px-4">
                        {jobFile ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 line-clamp-1 max-w-[150px]">{jobFile.file_name}</span>
                            <span className="text-[10px] text-slate-400">{formatFileSize(jobFile.file_size)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold italic">Purged (24h limit)</span>
                        )}
                      </td>

                      {/* Created Time */}
                      <td className="py-4 px-4 text-xs text-slate-500">{safeDateTime(job.created_at)}</td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Secure download trigger */}
                          {jobFile && (
                            <button
                              onClick={() => handleDownloadFile(job.id)}
                              title="Secure Preview / Download"
                              className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}

                          {/* Reprint Trigger */}
                          {(job.print_status === "printed" || job.print_status === "failed") && !isFileExpired && (
                            <button
                              onClick={() => handleReprint(job.id)}
                              disabled={loadingJobId === job.id}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-orange-200 px-3 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Reprint
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Log Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="bg-slate-50/50 p-6 border-y border-slate-100">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
                              <Activity className="h-4 w-4 text-slate-400" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit History logs</h4>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                              {job.print_job_logs && job.print_job_logs.length > 0 ? (
                                job.print_job_logs.map((log) => (
                                  <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                                        {log.action.replace(/_/g, " ")}
                                      </span>
                                      <span className="text-[10px] text-slate-400">{safeDateTime(log.created_at)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs">
                                      <div className="flex items-center gap-1 text-slate-500">
                                        <User className="h-3 w-3" />
                                        <span>Actor: <strong className="text-slate-700 font-semibold">{log.actor}</strong></span>
                                      </div>
                                      {!!log.details && (
                                        <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-500 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                          {JSON.stringify(log.details, null, 2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-500 italic">No audit logs recorded.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-semibold bg-white">
                    No print jobs match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
