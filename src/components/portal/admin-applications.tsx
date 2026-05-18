"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";

import { AdminApplicationInlineUpdate } from "@/components/admin/admin-application-inline-update";
import { AdminEmptyState, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import type { AdminApplicationsAlert, AdminApplicationsCommandStats, AdminApplicationsFilterOptions } from "@/lib/admin-crm";

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "today", label: "Today" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "need_docs", label: "Need Docs" },
  { value: "unassigned", label: "Unassigned" },
  { value: "in_process", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "agent_apps", label: "Agent Apps" },
  { value: "failed_payment", label: "Failed Payment" },
  { value: "cancelled_refunded", label: "Cancelled / Refunded" },
];

const quickFilters = [
  { value: "today", label: "Today" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "need_docs", label: "Need Docs" },
  { value: "unassigned", label: "Unassigned" },
  { value: "in_process", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "agent_apps", label: "Agent Apps" },
];

const dateRanges = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : "-";
}

function rowHref(row: AdminApplicationRow) {
  return row.application_id ? `/admin/applications/${row.application_id}` : "/admin/applications";
}

function invoiceHref(row: AdminApplicationRow) {
  return row.invoice_id ? `/invoice/${row.invoice_id}` : rowHref(row);
}

function whatsAppHref(row: AdminApplicationRow) {
  const digits = row.mobile.replace(/\D/g, "");
  const mobile = digits.length === 10 ? `91${digits}` : digits;
  const message = `DigiConnect Dukan update for ${row.service} application ${shortId(row.application_id)}.`;

  return mobile ? `https://wa.me/${mobile}?text=${encodeURIComponent(message)}` : "https://wa.me/917007595931";
}

function sourceLabel(row: AdminApplicationRow) {
  const value = normalize(row.source_label);
  if (value === "agent_pos" || value === "agent") return "Agent";
  if (value === "admin") return "Admin";
  if (value === "staff") return "Staff";
  return "Website";
}

function docsLabel(row: AdminApplicationRow) {
  const rejected = row.rejected_document_count ?? 0;
  const total = row.document_count ?? row.uploaded_files.length;
  if (rejected > 0) return `${rejected} rejected`;
  if (total === 0) return "Missing";
  return `${total} file${total === 1 ? "" : "s"}`;
}

function docsTone(row: AdminApplicationRow) {
  if ((row.rejected_document_count ?? 0) > 0) return "bg-red-50 text-red-700";
  if ((row.document_count ?? row.uploaded_files.length) === 0) return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

function pageHref(page: number, filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all") params.set("payment", filters.paymentStatus);
  if (filters.service !== "all") params.set("service", filters.service);
  if (filters.staffId !== "all") params.set("staff", filters.staffId);
  if (filters.agent !== "all") params.set("agent", filters.agent);
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (filters.unassignedOnly) params.set("unassigned", "1");
  if (filters.documentsMissingOnly) params.set("docs", "missing");
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/applications?${suffix}` : "/admin/applications";
}

type FiltersState = {
  query: string;
  status: string;
  paymentStatus: string;
  service: string;
  staffId: string;
  agent: string;
  dateRange: string;
  unassignedOnly: boolean;
  documentsMissingOnly: boolean;
};

function exportRows(rows: AdminApplicationRow[]) {
  const headers = [
    "Application ID",
    "Customer",
    "Mobile",
    "Email",
    "Service",
    "Source",
    "Staff",
    "Agent",
    "Status",
    "Payment",
    "Total",
    "Fresh Paid",
    "Wallet Used",
    "Docs",
    "Created",
    "Updated",
  ];
  const values = rows.map((row) => [
    row.application_id ?? row.id,
    row.customer_name,
    row.mobile,
    row.customer_email ?? "",
    row.service,
    sourceLabel(row),
    row.assigned_staff_name ?? "",
    row.agent_name ?? "",
    row.application_status,
    row.payment_status ?? "",
    String(row.total_amount ?? 0),
    String(row.fresh_paid_amount ?? row.payment_amount ?? 0),
    String(row.wallet_redeemed_amount ?? 0),
    docsLabel(row),
    row.created_at,
    row.updated_at ?? "",
  ]);
  const csv = [headers, ...values]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AlertStrip({ alerts }: { alerts: AdminApplicationsAlert[] }) {
  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-800">
        No urgent CRM warnings in the current command snapshot.
      </div>
    );
  }

  const toneClass = {
    orange: "bg-orange-50 text-orange-800 border-orange-100",
    red: "bg-red-50 text-red-800 border-red-100",
    blue: "bg-blue-50 text-blue-800 border-blue-100",
    purple: "bg-purple-50 text-purple-800 border-purple-100",
  };

  return (
    <div className="grid gap-2 lg:grid-cols-4">
      {alerts.map((alert) => (
        <div key={alert.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${toneClass[alert.tone]}`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{alert.label}</p>
            <p className="text-xs font-semibold opacity-80">{alert.count} item{alert.count === 1 ? "" : "s"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailDrawer({
  row,
  staffOptions,
  onClose,
}: {
  row: AdminApplicationRow | null;
  staffOptions: { id: string; label: string }[];
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close details" className="absolute inset-0 bg-slate-950/35" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Application Detail</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{row.service}</h2>
              <p className="mt-1 font-mono text-xs text-slate-500">{row.application_id ?? row.id}</p>
            </div>
            <button type="button" aria-label="Close details" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <section className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Customer</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{row.customer_name || "Customer"}</p>
            <p className="mt-1 font-mono text-sm text-slate-600">{row.mobile || "-"}</p>
            <p className="mt-1 text-sm text-slate-600">{row.customer_email || "No email"}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Status</p>
              <div className="mt-2"><AdminStatusBadge status={row.application_status} /></div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Payment</p>
              <div className="mt-2"><AdminStatusBadge status={row.payment_status} /></div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="mt-2 font-bold text-slate-950">{safeCurrency(row.total_amount)}</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Fresh Paid</p>
              <p className="mt-2 font-bold text-slate-950">{safeCurrency(row.fresh_paid_amount ?? row.payment_amount)}</p>
            </div>
          </section>

          <section className="rounded-2xl border p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Assignment</p>
            <div className="mt-3">
              {row.application_id ? (
                <AdminApplicationInlineUpdate
                  applicationId={row.application_id}
                  status={row.application_status}
                  assignedStaffId={row.assigned_staff_id}
                  staffOptions={staffOptions}
                />
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">Staff: {row.assigned_staff_name || "Unassigned"}</p>
            <p className="mt-1 text-sm text-slate-600">Agent: {row.agent_name || row.agent_code || "None"}</p>
          </section>

          <section className="rounded-2xl border p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Documents, Invoice & Payment</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Documents: <span className="font-bold">{docsLabel(row)}</span></p>
              <p>Invoice: <span className="font-bold">{row.invoice_number || "Not generated"}</span></p>
              <p>Razorpay Payment: <span className="font-mono text-xs">{row.razorpay_payment_id || "-"}</span></p>
              <p>Wallet Used: <span className="font-bold">{safeCurrency(row.wallet_redeemed_amount)}</span></p>
              <p>Commission: <span className="font-bold">{safeCurrency(row.commission_amount)} {row.commission_status ? `(${row.commission_status})` : ""}</span></p>
            </div>
          </section>

          {row.latest_note ? (
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-600">Latest Note</p>
              <p className="mt-2 text-sm leading-6 text-blue-950">{row.latest_note}</p>
            </section>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={rowHref(row)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
              <ExternalLink className="h-4 w-4" />
              Full Detail
            </Link>
            <a href={whatsAppHref(row)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RowActions({ row, onOpen }: { row: AdminApplicationRow; onOpen: () => void }) {
  const detailHref = rowHref(row);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onOpen} className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-950 px-3 text-xs font-bold text-white">
        <MoreHorizontal className="h-3.5 w-3.5" />
        More
      </button>
      <Link href={detailHref} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
        <ExternalLink className="h-3.5 w-3.5" />
        View
      </Link>
      <a href={whatsAppHref(row)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </a>
      <Link href={invoiceHref(row)} className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700">
        <ReceiptText className="h-3.5 w-3.5" />
        Invoice
      </Link>
      <Link href={detailHref} className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-50 px-3 text-xs font-bold text-orange-700">
        <FileCheck2 className="h-3.5 w-3.5" />
        Docs
      </Link>
      <Link href={detailHref} className="inline-flex h-9 items-center gap-2 rounded-full bg-purple-50 px-3 text-xs font-bold text-purple-700">
        <WalletCards className="h-3.5 w-3.5" />
        Payment
      </Link>
      <Link href={detailHref} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-50 px-3 text-xs font-bold text-blue-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Update
      </Link>
    </div>
  );
}

export function AdminApplications({
  rows,
  agents = [],
  staff = [],
  total,
  page,
  pageSize,
  initialSearch = "",
  initialStatus = "all",
  initialPaymentStatus = "all",
  initialService = "all",
  initialStaffId = "all",
  initialAgent = "all",
  initialDateRange = "all",
  initialUnassignedOnly = false,
  initialDocumentsMissingOnly = false,
  stats,
  alerts,
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
  alerts: AdminApplicationsAlert[];
  filterOptions: AdminApplicationsFilterOptions;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeRow, setActiveRow] = useState<AdminApplicationRow | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    query: initialSearch,
    status: initialStatus || "all",
    paymentStatus: initialPaymentStatus || "all",
    service: initialService || "all",
    staffId: initialStaffId || "all",
    agent: initialAgent || "all",
    dateRange: initialDateRange || "all",
    unassignedOnly: initialUnassignedOnly,
    documentsMissingOnly: initialDocumentsMissingOnly,
  });
  const staffOptions = useMemo(() => staff.map((item) => ({ id: item.id, label: item.full_name || item.email })), [staff]);
  const agentOptions = useMemo(() => agents.map((item) => ({ id: item.id, label: item.full_name || item.agent_code || item.email })), [agents]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function go(nextFilters: FiltersState, nextPage = 1) {
    setFilters(nextFilters);
    startTransition(() => {
      router.push(pageHref(nextPage, nextFilters));
    });
  }

  function submitFilters(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    go(filters);
  }

  function quickFilter(status: string) {
    go({ ...filters, status, unassignedOnly: status === "unassigned", documentsMissingOnly: status === "need_docs" });
  }

  return (
    <div className="mx-auto max-w-[96rem] space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">CRM Command Center</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">Applications</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Track, assign, verify payments, manage documents, invoices, and completion from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/applications" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-700">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Link>
            <button type="button" onClick={() => exportRows(rows)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-700">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <Link href="/agent/applications/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
              <ClipboardList className="h-4 w-4" />
              New Application
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard title="Total Applications" value={stats.totalApplications} icon="fileText" tone="blue" />
        <AdminStatCard title="New Today" value={stats.newToday} icon="calendarDays" tone="green" />
        <AdminStatCard title="Payment Pending" value={stats.paymentPending} icon="receiptText" tone="orange" />
        <AdminStatCard title="Documents Missing" value={stats.documentsMissing} icon="fileClock" tone="orange" />
        <AdminStatCard title="In Progress" value={stats.inProgress} icon="repeat" tone="blue" />
        <AdminStatCard title="Completed Today" value={stats.completedToday} icon="clipboardList" tone="green" />
        <AdminStatCard title="Staff Unassigned" value={stats.staffUnassigned} icon="userCog" tone="slate" />
        <AdminStatCard title="Agent Applications" value={stats.agentApplications} icon="userCheck" tone="blue" />
        <AdminStatCard title="Revenue Today" value={safeCurrency(stats.revenueToday)} icon="indianRupee" tone="green" />
        <AdminStatCard title="Wallet / Cashback" value={`${safeCurrency(stats.walletUsed)} / ${safeCurrency(stats.cashbackLiability)}`} icon="wallet" tone="orange" />
      </section>

      <AlertStrip alerts={alerts} />

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={submitFilters} className="grid gap-3">
          <div className="grid gap-3 xl:grid-cols-[1.2fr_170px_170px_210px_180px_170px_150px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="ID, customer, mobile, email, service, agent, Razorpay, invoice..."
                className="h-11 pl-11"
              />
            </label>
            <Select value={filters.status} onValueChange={(value) => go({ ...filters, status: value })} disabled={isPending}>
              <SelectTrigger aria-label="Status filter" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{statusFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.paymentStatus} onValueChange={(value) => go({ ...filters, paymentStatus: value })} disabled={isPending}>
              <SelectTrigger aria-label="Payment filter" className="h-11"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {filterOptions.paymentStatuses.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.service} onValueChange={(value) => go({ ...filters, service: value })} disabled={isPending}>
              <SelectTrigger aria-label="Service filter" className="h-11"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {filterOptions.services.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.staffId} onValueChange={(value) => go({ ...filters, staffId: value })} disabled={isPending}>
              <SelectTrigger aria-label="Staff filter" className="h-11"><SelectValue placeholder="Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {staffOptions.map((staffMember) => <SelectItem key={staffMember.id} value={staffMember.id}>{staffMember.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.agent} onValueChange={(value) => go({ ...filters, agent: value })} disabled={isPending}>
              <SelectTrigger aria-label="Source filter" className="h-11"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="agent">Agent apps</SelectItem>
                <SelectItem value="website">Website apps</SelectItem>
                <SelectItem value="admin">Admin apps</SelectItem>
                <SelectItem value="staff">Staff apps</SelectItem>
                {agentOptions.slice(0, 8).map((agentOption) => (
                  <SelectItem key={agentOption.id} value={`agent:${agentOption.id}`}>{agentOption.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.dateRange} onValueChange={(value) => go({ ...filters, dateRange: value })} disabled={isPending}>
              <SelectTrigger aria-label="Date range" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{dateRanges.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="submit" disabled={isPending} className="h-11 rounded-full">
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Apply
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => quickFilter(item.value)}
                className={`h-9 rounded-full px-3 text-xs font-bold transition ${filters.status === item.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={() => go({ ...filters, unassignedOnly: !filters.unassignedOnly })} className={`h-9 rounded-full px-3 text-xs font-bold ${filters.unassignedOnly ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}>
              Unassigned only
            </button>
            <button type="button" onClick={() => go({ ...filters, documentsMissingOnly: !filters.documentsMissingOnly })} className={`h-9 rounded-full px-3 text-xs font-bold ${filters.documentsMissingOnly ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700"}`}>
              Docs missing only
            </button>
          </div>
        </form>

        {!rows.length ? (
          <div className="mt-5">
            <AdminEmptyState title="No applications found" description="Try a different search, status, service, date, staff, or payment filter." />
          </div>
        ) : null}

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-100 2xl:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Application ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Assigned Staff</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-right">Net Received</th>
                <th className="px-3 py-3 text-right">Wallet</th>
                <th className="px-3 py-3">Docs</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Last Update</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white align-top hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setActiveRow(row)} className="font-mono text-xs font-bold text-blue-700">{shortId(row.application_id ?? row.id)}</button>
                    {row.razorpay_payment_id ? <p className="mt-1 max-w-28 truncate font-mono text-[11px] text-slate-500">{row.razorpay_payment_id}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="max-w-44 truncate font-bold text-slate-950">{row.customer_name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{row.mobile || "-"}</p>
                    <p className="mt-1 max-w-44 truncate text-xs text-slate-500">{row.customer_email || "-"}</p>
                  </td>
                  <td className="px-3 py-3 max-w-44 text-slate-700">{row.service}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">{sourceLabel(row)}</span></td>
                  <td className="px-3 py-3 text-sm text-slate-700">{row.assigned_staff_name || <span className="text-orange-600">Unassigned</span>}</td>
                  <td className="px-3 py-3"><AdminStatusBadge status={row.application_status} /></td>
                  <td className="px-3 py-3"><AdminStatusBadge status={row.payment_status} /></td>
                  <td className="px-3 py-3 text-right font-bold text-slate-900">{safeCurrency(row.total_amount)}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{safeCurrency(row.fresh_paid_amount ?? row.payment_amount)}</td>
                  <td className="px-3 py-3 text-right text-purple-700">{safeCurrency(row.wallet_redeemed_amount)}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${docsTone(row)}`}>{docsLabel(row)}</span></td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500">{safeDateTime(row.updated_at)}</td>
                  <td className="px-3 py-3"><RowActions row={row} onOpen={() => setActiveRow(row)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 2xl:hidden">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-950">{row.service}</p>
                  <p className="mt-1 truncate font-bold text-slate-700">{row.customer_name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{row.mobile || row.customer_email || "-"}</p>
                </div>
                <div className="shrink-0"><AdminStatusBadge status={row.application_status} /></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminStatusBadge status={row.payment_status} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{safeCurrency(row.total_amount)}</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Staff: {row.assigned_staff_name || "Unassigned"}</span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">{sourceLabel(row)}</span>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                <p>Created: {safeDateTime(row.created_at)}</p>
                <p>Fresh paid: {safeCurrency(row.fresh_paid_amount ?? row.payment_amount)}</p>
                <p>Docs: {docsLabel(row)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={rowHref(row)} className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
                  <ExternalLink className="h-4 w-4" />
                  View
                </Link>
                <button type="button" onClick={() => setActiveRow(row)} className="inline-flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-800">
                  <UserRoundCheck className="h-4 w-4" />
                  Assign
                </button>
                <a href={whatsAppHref(row)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} - {total} matching applications
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(Math.max(1, page - 1), filters)}
              aria-disabled={page <= 1}
              className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
            <Link
              href={pageHref(Math.min(totalPages, page + 1), filters)}
              aria-disabled={page >= totalPages}
              className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <p className="mt-3 text-sm font-bold text-slate-950">Documents</p>
          <p className="mt-1 text-xs text-slate-500">Use row detail or full application page for review actions.</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <ReceiptText className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 text-sm font-bold text-slate-950">Invoices</p>
          <p className="mt-1 text-xs text-slate-500">Invoice links open when an invoice is available.</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <WalletCards className="h-5 w-5 text-purple-600" />
          <p className="mt-3 text-sm font-bold text-slate-950">Wallet</p>
          <p className="mt-1 text-xs text-slate-500">Wallet redeemed and cashback liability are tracked in KPIs.</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <ShieldCheck className="h-5 w-5 text-orange-600" />
          <p className="mt-3 text-sm font-bold text-slate-950">Completion</p>
          <p className="mt-1 text-xs text-slate-500">Risky actions link to the full detail workflow.</p>
        </div>
      </section>

      <DetailDrawer row={activeRow} staffOptions={staffOptions} onClose={() => setActiveRow(null)} />
    </div>
  );
}
