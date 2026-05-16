"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Search } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminApplicationInlineUpdate } from "@/components/admin/admin-application-inline-update";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "paid_submitted", label: "Paid / Submitted" },
  { value: "in_process", label: "In Process" },
  { value: "completed", label: "Completed" },
  { value: "failed_payment", label: "Failed Payment" },
  { value: "cancelled_refunded", label: "Cancelled / Refunded" },
];

function pageHref(page: number, query: string, status: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (status && status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/applications?${suffix}` : "/admin/applications";
}

export function AdminApplications({
  rows,
  staff = [],
  total,
  page,
  pageSize,
  initialSearch = "",
  initialStatus = "all",
}: {
  rows: AdminApplicationRow[];
  agents?: PortalUser[];
  staff?: PortalUser[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus || "all");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const staffOptions = staff.map((item) => ({ id: item.id, label: item.full_name || item.email }));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function submitFilters(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    startTransition(() => {
      router.push(pageHref(1, search, status));
    });
  }

  function updateStatus(value: string) {
    setStatus(value);
    startTransition(() => {
      router.push(pageHref(1, search, value));
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Applications"
        title="Applications"
        description="One row per application with canonical payment status, Razorpay IDs, and server-side search."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Showing" value={rows.length} icon="fileText" tone="blue" />
        <AdminStatCard title="Total Match" value={total} icon="listChecks" tone="green" />
        <AdminStatCard title="Payment Pending" value={rows.filter((row) => row.application_status === "payment_pending" || row.payment_status === "pending").length} icon="receiptText" tone="orange" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <form onSubmit={submitFilters} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, mobile, email, application id, service, Razorpay..."
              className="h-11 pl-11"
            />
          </label>
          <Select value={status} onValueChange={updateStatus} disabled={isPending}>
            <SelectTrigger aria-label="Status filter" className="h-11">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="submit" disabled={isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60">
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {isPending ? "Searching..." : "Search"}
          </button>
        </form>

        {!rows.length ? (
          <div className="mt-5">
            <AdminEmptyState title="No applications found" description="Try a different search or status filter." />
          </div>
        ) : null}

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-100 xl:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Fresh Paid</th>
                <th className="px-4 py-3 text-right">Wallet</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-800">{(row.application_id ?? row.id).slice(0, 8)}</p>
                    {row.razorpay_payment_id ? <p className="mt-1 max-w-36 truncate font-mono text-[11px] text-slate-500">{row.razorpay_payment_id}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">{row.customer_name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{row.mobile || row.customer_email || "-"}</p>
                  </td>
                  <td className="px-4 py-3 max-w-44 truncate text-slate-700">{row.service}</td>
                  <td className="px-4 py-3"><AdminStatusBadge status={row.application_status} /></td>
                  <td className="px-4 py-3"><AdminStatusBadge status={row.payment_status} /></td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{safeCurrency(row.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{safeCurrency(row.fresh_paid_amount ?? row.payment_amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{safeCurrency(row.wallet_redeemed_amount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</td>
                  <td className="px-4 py-3">
                    {row.application_id ? (
                      <AdminApplicationInlineUpdate
                        applicationId={row.application_id}
                        status={row.application_status}
                        assignedStaffId={row.assigned_staff_id}
                        staffOptions={staffOptions}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.application_id ? (
                      <Link href={`/admin/applications/${row.application_id}`} onClick={() => setOpeningId(row.id)} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                        {openingId === row.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        {openingId === row.id ? "Opening..." : "View"}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 xl:hidden">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{row.customer_name}</p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{row.mobile || row.customer_email || "-"}</p>
                </div>
                <AdminStatusBadge status={row.application_status} />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">{row.service}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminStatusBadge status={row.payment_status} />
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  Fresh {safeCurrency(row.fresh_paid_amount ?? row.payment_amount)}
                </span>
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  Wallet {safeCurrency(row.wallet_redeemed_amount)}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs text-slate-500">{safeDateTime(row.created_at)}</p>
              {row.application_id ? (
                <div className="mt-4">
                  <AdminApplicationInlineUpdate applicationId={row.application_id} status={row.application_status} assignedStaffId={row.assigned_staff_id} staffOptions={staffOptions} />
                </div>
              ) : null}
              {row.application_id ? (
                <Link href={`/admin/applications/${row.application_id}`} onClick={() => setOpeningId(row.id)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
                  {openingId === row.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {openingId === row.id ? "Opening..." : "View Details"}
                </Link>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} · {total} matching applications
          </p>
          <div className="flex gap-2">
            <Link
              href={pageHref(Math.max(1, page - 1), search, status)}
              aria-disabled={page <= 1}
              className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
            <Link
              href={pageHref(Math.min(totalPages, page + 1), search, status)}
              aria-disabled={page >= totalPages}
              className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold text-slate-700 aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
