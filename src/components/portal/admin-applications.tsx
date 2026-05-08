"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, FileText, ReceiptText, RotateCcw, Search } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminApplicationInlineUpdate } from "@/components/admin/admin-application-inline-update";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount ?? 0));
}

export function AdminApplications({ rows, staff = [] }: { rows: AdminApplicationRow[]; agents?: PortalUser[]; staff?: PortalUser[] }) {
  const applicationRows = rows.filter((row) => row.source === "application");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const staffOptions = staff.map((item) => ({ id: item.id, label: item.full_name || item.email }));
  const services = useMemo(() => Array.from(new Set(applicationRows.map((row) => row.service))).sort(), [applicationRows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applicationRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.customer_name.toLowerCase().includes(query) ||
        row.mobile.toLowerCase().includes(query) ||
        row.service.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        row.application_status === statusFilter ||
        (statusFilter === "in_progress" && ["documents_pending", "payment_pending", "in_process", "submitted", "in_progress"].includes(row.application_status));
      const matchesPayment = paymentFilter === "all" || row.payment_status === paymentFilter;
      const matchesService = serviceFilter === "all" || row.service === serviceFilter;
      const matchesStaff = staffFilter === "all" || (staffFilter === "none" ? !row.assigned_staff_id : row.assigned_staff_id === staffFilter);
      const rowDate = row.created_at.slice(0, 10);
      const matchesDateFrom = !dateFrom || rowDate >= dateFrom;
      const matchesDateTo = !dateTo || rowDate <= dateTo;

      return matchesSearch && matchesStatus && matchesPayment && matchesService && matchesStaff && matchesDateFrom && matchesDateTo;
    });
  }, [applicationRows, dateFrom, dateTo, paymentFilter, search, serviceFilter, staffFilter, statusFilter]);
  const hasFilters = search || statusFilter !== "all" || paymentFilter !== "all" || serviceFilter !== "all" || staffFilter !== "all" || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setServiceFilter("all");
    setStaffFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Applications"
        title="Applications"
        description="Track customer applications, Razorpay payments, uploaded documents, and final status."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Applications" value={applicationRows.length} icon={FileText} tone="blue" />
        <AdminStatCard title="Pending" value={applicationRows.filter((row) => row.application_status !== "completed" && row.application_status !== "rejected").length} icon={ReceiptText} tone="orange" />
        <AdminStatCard title="Completed" value={applicationRows.filter((row) => row.application_status === "completed").length} icon={FileText} tone="green" />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_190px_170px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, mobile, service..." className="h-11 pl-11" />
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Status filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger aria-label="Payment filter">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger aria-label="Service filter">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {services.map((service) => (
                <SelectItem key={service} value={service}>{service}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger aria-label="Staff filter">
              <SelectValue placeholder="Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {staffOptions.map((staffMember) => (
                <SelectItem key={staffMember.id} value={staffMember.id}>{staffMember.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
          <button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50">
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>

        {!filteredRows.length ? (
          <div className="mt-5">
            <AdminEmptyState title={applicationRows.length ? "No matching applications" : "No applications yet"} description={applicationRows.length ? "Try a different search or filter." : "New customer applications will appear here."} />
          </div>
        ) : null}

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-100 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3">Razorpay</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-3 font-bold text-slate-950">{row.customer_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.mobile || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.service}</td>
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
                    {row.razorpay_payment_id || row.razorpay_order_id ? (
                      <div className="max-w-48 space-y-1">
                        <p className="truncate font-mono text-xs font-bold text-slate-800">{row.razorpay_payment_id ?? row.razorpay_order_id}</p>
                        <p className="text-xs font-bold capitalize text-slate-500">
                          {formatCurrency(row.payment_amount)}
                          {row.payment_method ? ` - ${row.payment_method}` : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    {row.application_id ? (
                      <Link href={`/admin/applications/${row.application_id}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 lg:hidden">
          {filteredRows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{row.customer_name}</p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{row.mobile || "-"}</p>
                </div>
                <AdminStatusBadge status={row.application_status} />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">{row.service}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <AdminStatusBadge status={row.payment_status} />
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {row.assigned_staff_name || "Unassigned"}
                </span>
                {row.razorpay_payment_id ? (
                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    Razorpay {row.razorpay_payment_id}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-mono text-xs text-slate-500">{formatDate(row.created_at)}</p>
              {row.application_id ? (
                <div className="mt-4">
                  <AdminApplicationInlineUpdate
                    applicationId={row.application_id}
                    status={row.application_status}
                    assignedStaffId={row.assigned_staff_id}
                    staffOptions={staffOptions}
                  />
                </div>
              ) : null}
              {row.application_id ? (
                <Link href={`/admin/applications/${row.application_id}`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
