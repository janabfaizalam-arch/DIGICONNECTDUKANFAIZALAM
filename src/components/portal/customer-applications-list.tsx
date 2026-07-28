"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { resolveCustomerNextAction } from "@/lib/applications/customer-next-action";
import { formatCurrency } from "@/lib/portal-data";
import type { CustomerDashboardApplication } from "@/lib/customer-dashboard-data";

type ApplicationFilter = "all" | "active" | "payment_pending" | "documents_required" | "completed";

const filters: { id: ApplicationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "payment_pending", label: "Payment Pending" },
  { id: "documents_required", label: "Documents Required" },
  { id: "completed", label: "Completed" },
];

const PAGE_SIZE = 10;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function applicationAmount(application: CustomerDashboardApplication) {
  const value = application.total_amount ?? application.amount ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function matchesFilter(application: CustomerDashboardApplication, filter: ApplicationFilter) {
  const status = String(application.status || "").toLowerCase();
  const payment = String(application.payment_status || "").toLowerCase();

  if (filter === "all") return true;
  if (filter === "completed") return status === "completed" || status === "delivered";
  if (filter === "payment_pending") {
    return payment === "pending" || payment === "failed" || status === "payment_pending";
  }
  if (filter === "documents_required") {
    return status === "documents_required" || status === "document_pending";
  }
  if (filter === "active") {
    return status !== "completed" && status !== "delivered" && status !== "cancelled" && status !== "refunded";
  }
  return true;
}

export function CustomerApplicationsList({
  applications,
  pageSize = PAGE_SIZE,
}: {
  applications: CustomerDashboardApplication[];
  pageSize?: number;
}) {
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((application) => {
      if (!matchesFilter(application, filter)) return false;
      if (!q) return true;
      const id = String(application.id || "").toLowerCase();
      const code = String((application as { application_code?: string }).application_code || "").toLowerCase();
      const name = String(application.service_name || "").toLowerCase();
      return id.includes(q) || code.includes(q) || name.includes(q);
    });
  }, [applications, filter, query]);

  const visibleApplications = filtered.slice(0, visibleCount);

  return (
    <section id="applications" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 shadow-none md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Applications</h2>
          <p className="mt-0.5 text-xs text-slate-500">{filtered.length} shown</p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(pageSize);
            }}
            placeholder="Search ID or service"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-300"
            aria-label="Search applications"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Application filters">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setFilter(item.id);
              setVisibleCount(pageSize);
            }}
            className={`h-8 rounded-lg px-2.5 text-[11px] font-semibold transition ${
              filter === item.id ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!applications.length ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-bold text-slate-950">No active applications</p>
          <Link href="/apply" className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white">
            Apply for New Service
          </Link>
        </div>
      ) : !visibleApplications.length ? (
        <p className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          No applications match this filter.
        </p>
      ) : (
        <>
          <div className="mt-4 hidden md:block">
            <div className="grid grid-cols-[minmax(0,1.4fr)_120px_100px_100px_120px] gap-2 border-b border-slate-100 px-2 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <span>Service</span>
              <span>Status</span>
              <span>Payment</span>
              <span>Updated</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleApplications.map((application) => {
                const next = resolveCustomerNextAction({
                  applicationId: application.id,
                  status: application.status,
                  paymentStatus: application.payment_status,
                  missingDocuments:
                    application.status === "documents_required" || application.status === "document_pending",
                });
                return (
                  <div key={application.id} className="grid grid-cols-[minmax(0,1.4fr)_120px_100px_100px_120px] items-center gap-2 px-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{application.service_name}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{application.id}</p>
                    </div>
                    <StatusBadge status={application.status} />
                    <PaymentBadge status={application.payment_status ?? "pending"} />
                    <span className="text-[11px] text-slate-500">{formatDate(application.created_at)}</span>
                    <Link href={next.href} className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-[11px] font-semibold text-white">
                      {next.label}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:hidden">
            {visibleApplications.map((application) => {
              const next = resolveCustomerNextAction({
                applicationId: application.id,
                status: application.status,
                paymentStatus: application.payment_status,
                missingDocuments:
                  application.status === "documents_required" || application.status === "document_pending",
              });
              return (
                <article key={application.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950">{application.service_name}</h3>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{application.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={application.status} />
                      <PaymentBadge status={application.payment_status ?? "pending"} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatDate(application.created_at)}</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(applicationAmount(application))}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/customer/applications/${application.id}`}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Details
                    </Link>
                    <Link
                      href={next.href}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white"
                    >
                      {next.label}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleCount < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + pageSize)}
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Load more
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
