"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, FileText, ReceiptText, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminApplicationRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function statusLabel(status: string) {
  if (["documents_pending", "payment_pending", "in_process", "submitted", "in_progress"].includes(status)) {
    return "In Progress";
  }

  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === "completed" || status === "verified") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "rejected" || status === "failed") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (status.includes("pending") || status === "in_progress" || status === "in_process") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", statusClass(status))}>
      {statusLabel(status)}
    </span>
  );
}

function FileLinks({ row }: { row: AdminApplicationRow }) {
  if (row.uploaded_files.length === 0) {
    return <span className="text-sm text-slate-400">No file</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {row.uploaded_files.map((file) => (
        <a
          key={file.id}
          href={file.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white"
          title={[file.document_type, file.file_type, file.storage_path].filter(Boolean).join(" | ")}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="max-w-[180px] truncate">{file.file_name}</span>
        </a>
      ))}
    </div>
  );
}

export function AdminApplications({ rows }: { rows: AdminApplicationRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const applicationCount = rows.filter((row) => row.source === "application").length;
  const withFilesCount = rows.filter((row) => row.uploaded_files.length > 0).length;
  const services = useMemo(() => Array.from(new Set(rows.map((row) => row.service))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.customer_name.toLowerCase().includes(query) ||
        row.mobile.toLowerCase().includes(query) ||
        row.service.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || row.application_status === statusFilter;
      const matchesService = serviceFilter === "all" || row.service === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [rows, search, serviceFilter, statusFilter]);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Panel</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-5xl">Applications Control Room</h1>
          <p className="mt-3 text-slate-600">
            Customer applications, uploaded documents, payment proof, and public leads are listed latest first.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">Total Records</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{rows.length}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">Applications</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{applicationCount}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">With Files</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{withFilesCount}</p>
          </Card>
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_260px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_process">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger aria-label="Service filter">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Service</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-blue-50/60 p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <p className="mt-3 text-lg font-bold text-slate-950">No applications yet</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border lg:block">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const firstFile = row.uploaded_files[0];

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-bold text-slate-950">{row.customer_name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-700">{row.mobile || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-700">{row.service}</TableCell>
                          <TableCell className="max-w-[240px] text-sm text-slate-600">{row.message || "-"}</TableCell>
                          <TableCell>
                            <FileLinks row={row} />
                          </TableCell>
                          <TableCell className="max-w-[160px] break-all text-xs font-medium text-slate-500">
                            {firstFile?.file_type || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusPill status={row.payment_status} />
                          </TableCell>
                          <TableCell>
                            <StatusPill status={row.invoice_status} />
                          </TableCell>
                          <TableCell>
                            <StatusPill status={row.application_status} />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{formatDate(row.created_at)}</TableCell>
                          <TableCell>
                            {row.application_id ? (
                              <Link
                                href={`/admin/applications/${row.application_id}`}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View
                              </Link>
                            ) : (
                              <span className="inline-flex h-10 items-center justify-center rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-500">
                                Public Lead
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 lg:hidden">
                {filteredRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{row.customer_name}</p>
                        <p className="mt-1 font-mono text-sm text-slate-600">{row.mobile || "-"}</p>
                      </div>
                      <StatusPill status={row.application_status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800">{row.service}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{row.message || "-"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill status={row.payment_status} />
                      <StatusPill status={row.invoice_status} />
                    </div>
                    <div className="mt-4">
                      <FileLinks row={row} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600">
                        <ReceiptText className="h-4 w-4" />
                        {formatDate(row.created_at)}
                      </span>
                      {row.application_id ? (
                        <Link
                          href={`/admin/applications/${row.application_id}`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-xs font-bold text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
