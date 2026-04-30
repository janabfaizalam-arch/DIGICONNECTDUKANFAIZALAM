"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, ReceiptText, RotateCcw, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/portal-data";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";
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

export function AdminApplications({ rows, agents = [] }: { rows: AdminApplicationRow[]; agents?: PortalUser[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const totalLeads = rows.length;
  const todayStamp = new Date().toISOString().slice(0, 10);
  const todayLeads = rows.filter((row) => row.created_at.slice(0, 10) === todayStamp).length;
  const newCount = rows.filter((row) => row.application_status === "new").length;
  const completedCount = rows.filter((row) => row.application_status === "completed").length;
  const paymentPendingCount = rows.filter((row) => row.payment_status === "pending").length;
  const commissionPendingTotal = rows
    .filter((row) => row.commission_status === "pending")
    .reduce((total, row) => total + Number(row.commission_amount ?? 0), 0);
  const agentPerformance = useMemo(
    () =>
      agents.map((agent) => {
        const agentRows = rows.filter((row) => row.agent_id === agent.id);
        const completed = agentRows.filter((row) => row.application_status === "completed").length;
        const commission = agentRows.reduce((total, row) => total + Number(row.commission_amount ?? 0), 0);

        return {
          id: agent.id,
          name: agent.full_name || agent.email,
          total: agentRows.length,
          completed,
          commission,
        };
      }),
    [agents, rows],
  );
  const services = useMemo(() => Array.from(new Set(rows.map((row) => row.service))).sort(), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        const matchesSearch =
          !query ||
          row.customer_name.toLowerCase().includes(query) ||
          row.mobile.toLowerCase().includes(query) ||
          row.service.toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" ||
          row.application_status === statusFilter ||
          (statusFilter === "in_progress" &&
            ["documents_pending", "payment_pending", "in_process", "submitted", "in_progress"].includes(row.application_status));
        const matchesPayment = paymentFilter === "all" || row.payment_status === paymentFilter;
        const matchesAgent = agentFilter === "all" || row.agent_id === agentFilter;
        const matchesService = serviceFilter === "all" || row.service === serviceFilter;
        const rowDate = row.created_at.slice(0, 10);
        const matchesDateFrom = !dateFrom || rowDate >= dateFrom;
        const matchesDateTo = !dateTo || rowDate <= dateTo;

        return matchesSearch && matchesStatus && matchesPayment && matchesAgent && matchesService && matchesDateFrom && matchesDateTo;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.created_at).getTime();
        const secondTime = new Date(second.created_at).getTime();

        return sortOrder === "latest" ? secondTime - firstTime : firstTime - secondTime;
      });
  }, [rows, search, serviceFilter, sortOrder, statusFilter, paymentFilter, agentFilter, dateFrom, dateTo]);
  const hasFilters =
    search ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    agentFilter !== "all" ||
    serviceFilter !== "all" ||
    dateFrom ||
    dateTo ||
    sortOrder !== "latest";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setAgentFilter("all");
    setServiceFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortOrder("latest");
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Applications</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-5xl">Applications List</h1>
          <p className="mt-3 text-slate-600">Clean application tracking. Files and payment proof are available inside the detail page.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total Applications", totalLeads, "text-slate-950"],
            ["Today Leads", todayLeads, "text-blue-700"],
            ["Pending", newCount, "text-orange-600"],
            ["Completed", completedCount, "text-emerald-600"],
            ["Payment Pending", paymentPendingCount, "text-red-600"],
            ["Commission Pending", formatCurrency(commissionPendingTotal), "text-indigo-600"],
          ].map(([label, value, tone]) => (
            <Card key={label} className="rounded-2xl p-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={cn("mt-2 text-2xl font-bold", tone as string)}>{value}</p>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_160px_160px_180px_200px_150px_150px_150px_auto]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, mobile, or service" />
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
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger aria-label="Payment status filter">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Payment</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger aria-label="Agent filter">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Agent</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name || agent.email}
                  </SelectItem>
                ))}
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
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "latest" | "oldest")}>
              <SelectTrigger aria-label="Sort filter">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          {agentPerformance.length > 0 ? (
            <div className="mb-5 overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformance.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-bold text-slate-950">{agent.name}</TableCell>
                      <TableCell>{agent.total}</TableCell>
                      <TableCell>{agent.completed}</TableCell>
                      <TableCell>{formatCurrency(agent.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
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
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-bold text-slate-950">{row.customer_name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-700">{row.mobile || "-"}</TableCell>
                          <TableCell className="font-medium text-slate-700">{row.service}</TableCell>
                          <TableCell>
                            <StatusPill status={row.application_status} />
                          </TableCell>
                          <TableCell>
                            <StatusPill status={row.payment_status} />
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-700">{row.agent_name || "-"}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 lg:hidden">
                {filteredRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{row.customer_name}</p>
                        {row.mobile ? (
                          <a href={`tel:${row.mobile}`} className="mt-1 block font-mono text-sm text-[var(--primary)]">
                            {row.mobile}
                          </a>
                        ) : (
                          <p className="mt-1 font-mono text-sm text-slate-600">-</p>
                        )}
                      </div>
                      <StatusPill status={row.application_status} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800">{row.service}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill status={row.payment_status} />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Agent: {row.agent_name || "-"} | Commission: {row.commission_amount ? formatCurrency(row.commission_amount) : "-"}
                    </p>
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
                          View Details
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 items-center justify-center rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-500">
                          Public Lead
                        </span>
                      )}
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
