"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, MessageCircle, ReceiptText, Search } from "lucide-react";

import { AdminEmptyState, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import type { AdminApplicationsCommandStats, AdminApplicationsFilterOptions } from "@/lib/admin-crm";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "in_process", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "documents_required", label: "Documents Required" },
  { value: "rejected", label: "Rejected" },
];

const dateRanges = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

type FiltersState = {
  query: string;
  status: string;
  paymentStatus: string;
  staffId: string;
  dateRange: string;
};

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : "-";
}

function rowHref(row: AdminApplicationRow) {
  return row.application_id ? `/admin/applications/${row.application_id}` : "/admin/applications";
}

function invoiceHref(row: AdminApplicationRow) {
  return row.invoice_id ? `/invoice/${row.invoice_id}` : rowHref(row);
}

function whatsappHref(row: AdminApplicationRow) {
  const digits = String(row.mobile ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const mobile = digits.length === 10 ? `91${digits}` : digits;
  const message = `DigiConnect Dukan update for ${row.service} application ${shortId(row.application_id)}.`;
  return `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
}

function pageHref(page: number, filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all") params.set("payment", filters.paymentStatus);
  if (filters.staffId !== "all") params.set("staff", filters.staffId);
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/applications?${suffix}` : "/admin/applications";
}

function RowActions({ row }: { row: AdminApplicationRow }) {
  const whatsapp = whatsappHref(row);

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Link href={rowHref(row)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
        <ExternalLink className="h-3.5 w-3.5" />
        View
      </Link>
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      ) : (
        <span title="Customer mobile is missing" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-400">
          <MessageCircle className="h-3.5 w-3.5" />
          No mobile
        </span>
      )}
      <Link href={invoiceHref(row)} className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-white px-3 text-xs font-bold text-slate-800">
        <ReceiptText className="h-3.5 w-3.5" />
        {row.invoice_id ? "Invoice" : "Generate"}
      </Link>
    </div>
  );
}

export function AdminApplications({
  rows,
  staff = [],
  total,
  page,
  pageSize,
  initialSearch = "",
  initialStatus = "all",
  initialPaymentStatus = "all",
  initialStaffId = "all",
  initialDateRange = "all",
  stats,
  filterOptions,
}: {
  rows: AdminApplicationRow[];
  agents?: PortalUser[];
  staff?: PortalUser[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch?: string;
  initialStatus?: string;
  initialPaymentStatus?: string;
  initialService?: string;
  initialStaffId?: string;
  initialAgent?: string;
  initialDateRange?: string;
  initialUnassignedOnly?: boolean;
  initialDocumentsMissingOnly?: boolean;
  stats: AdminApplicationsCommandStats;
  alerts?: unknown[];
  filterOptions: AdminApplicationsFilterOptions;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FiltersState>({
    query: initialSearch,
    status: initialStatus || "all",
    paymentStatus: initialPaymentStatus || "all",
    staffId: initialStaffId || "all",
    dateRange: initialDateRange || "all",
  });
  const staffOptions = useMemo(() => staff.map((item) => ({ id: item.id, label: item.full_name || item.email })), [staff]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function go(nextFilters: FiltersState, nextPage = 1) {
    setFilters(nextFilters);
    startTransition(() => router.push(pageHref(nextPage, nextFilters)));
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(filters);
  }

  const kpis = [
    { title: "Total Applications", value: stats.totalApplications, icon: "fileText" as const, tone: "blue" as const, status: "all" },
    { title: "Payment Pending", value: stats.paymentPending, icon: "receiptText" as const, tone: "orange" as const, status: "payment_pending" },
    { title: "In Progress", value: stats.inProgress, icon: "repeat" as const, tone: "blue" as const, status: "in_process" },
    { title: "Completed", value: stats.completed, icon: "clipboardList" as const, tone: "green" as const, status: "completed" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Applications</h1>
            <p className="mt-1 text-sm text-slate-600">Search, filter, assign, invoice, and open customer applications.</p>
          </div>
          <Link href="/agent/applications/new" className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
            New Application
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <button key={kpi.title} type="button" onClick={() => go({ ...filters, status: kpi.status })} className="text-left">
            <AdminStatCard title={kpi.title} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-[1fr_180px_180px_220px_160px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search ID, customer, mobile, email, service, payment..."
              className="h-10 pl-11"
            />
          </label>
          <Select value={filters.status} onValueChange={(value) => go({ ...filters, status: value })} disabled={isPending}>
            <SelectTrigger aria-label="Status filter" className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>{statusFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.paymentStatus} onValueChange={(value) => go({ ...filters, paymentStatus: value })} disabled={isPending}>
            <SelectTrigger aria-label="Payment filter" className="h-10"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              {filterOptions.paymentStatuses.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.staffId} onValueChange={(value) => go({ ...filters, staffId: value })} disabled={isPending}>
            <SelectTrigger aria-label="Staff filter" className="h-10"><SelectValue placeholder="Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {staffOptions.map((staffMember) => <SelectItem key={staffMember.id} value={staffMember.id}>{staffMember.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.dateRange} onValueChange={(value) => go({ ...filters, dateRange: value })} disabled={isPending}>
            <SelectTrigger aria-label="Date filter" className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>{dateRanges.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" disabled={isPending} className="h-10 rounded-full">
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </form>

        {!rows.length ? (
          <div className="mt-4">
            <AdminEmptyState title="No applications found" description="Try a different search, status, payment, staff, or date filter." />
          </div>
        ) : null}

        <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-100 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Application ID</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Service</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Payment</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Staff</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} onClick={() => router.push(rowHref(row))} className="cursor-pointer bg-white hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{shortId(row.application_id ?? row.id)}</td>
                  <td className="px-3 py-2.5">
                    <p className="max-w-44 truncate font-bold text-slate-950">{row.customer_name || "Customer"}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">{row.mobile || row.customer_email || "-"}</p>
                  </td>
                  <td className="max-w-52 truncate px-3 py-2.5 text-slate-700">{row.service}</td>
                  <td className="px-3 py-2.5"><AdminStatusBadge status={row.application_status} /></td>
                  <td className="px-3 py-2.5"><AdminStatusBadge status={row.payment_status} /></td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">{safeCurrency(row.total_amount)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.assigned_staff_name || <span className="text-orange-600">Unassigned</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</td>
                  <td className="px-3 py-2.5"><RowActions row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 lg:hidden">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <Link href={rowHref(row)} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-950">{row.service}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">{row.customer_name || "Customer"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{shortId(row.application_id ?? row.id)} · {safeDateTime(row.created_at)}</p>
                  </div>
                  <AdminStatusBadge status={row.application_status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminStatusBadge status={row.payment_status} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{safeCurrency(row.total_amount)}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{row.assigned_staff_name || "Unassigned"}</span>
                </div>
              </Link>
              <div className="mt-3"><RowActions row={row} /></div>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} - {total} matching applications</p>
          <div className="flex gap-2">
            <Link href={pageHref(Math.max(1, page - 1), filters)} aria-disabled={page <= 1} className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
            <Link href={pageHref(Math.min(totalPages, page + 1), filters)} aria-disabled={page >= totalPages} className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40">
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
