"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { formatCurrency } from "@/lib/portal-data";
import type { CustomerDashboardApplication } from "@/lib/customer-dashboard-data";

type ApplicationFilter = "all" | "pending" | "in_progress" | "completed";

const filters: { id: ApplicationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function filterForStatus(status: string): ApplicationFilter {
  if (status === "completed" || status === "delivered") {
    return "completed";
  }

  if (status === "in_process" || status === "in_progress" || status === "assigned_to_agent" || status === "documents_verified" || status === "submitted") {
    return "in_progress";
  }

  return "pending";
}

function applicationAmount(application: CustomerDashboardApplication) {
  const value = application.total_amount ?? application.amount ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function getStatusStepIndex(status: string): number {
  if (status === "completed" || status === "delivered") {
    return 3;
  }
  if (status === "in_process" || status === "in_progress" || status === "assigned_to_agent") {
    return 2;
  }
  if (status === "documents_verified" || status === "documents_required" || status === "document_pending") {
    return 1;
  }
  return 0;
}

function ApplicationTimeline({ status }: { status: string }) {
  const currentStep = getStatusStepIndex(status);
  const steps = [
    { label: "Submitted", index: 0 },
    { label: "Docs Verified", index: 1 },
    { label: "In Process", index: 2 },
    { label: "Completed", index: 3 },
  ];

  const lineWidthPercent = `${(currentStep / 3) * 100}%`;

  return (
    <div className="mt-4 px-2 py-3 rounded-2xl bg-slate-50/55 border border-slate-100/50">
      <div className="timeline-track">
        <div className="timeline-line" />
        <div className="timeline-line-active" style={{ width: lineWidthPercent }} />
        
        {steps.map((step) => {
          const isCompleted = currentStep > step.index;
          const isActive = currentStep === step.index;
          
          return (
            <div key={step.index} className="timeline-node">
              <div className={`timeline-node-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                {isCompleted && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>
              <span className={`timeline-node-label ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerApplicationsList({ applications }: { applications: CustomerDashboardApplication[] }) {
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === "all" || filterForStatus(application.status) === filter),
    [applications, filter],
  );

  return (
    <section id="applications" className="scroll-mt-20 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">My Applications</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Applications</h2>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Application filters">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`h-9 rounded-full px-3 text-xs font-extrabold transition ${
                filter === item.id ? "bg-blue-700 text-white" : "border border-slate-100 bg-white text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!applications.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <p className="text-base font-bold text-slate-950">No applications yet.</p>
          <p className="mt-1 text-sm text-slate-600">Choose a service to start your first application.</p>
          <Link href="/services" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-blue-700 px-4 text-sm font-bold text-white">
            Browse Services
          </Link>
        </div>
      ) : !visibleApplications.length ? (
        <p className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm font-semibold text-slate-600">No {filter.replace("_", " ")} applications found.</p>
      ) : (
        <div className="mt-4 grid gap-2.5">
          {visibleApplications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-bold text-slate-950 md:text-base">{application.service_name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500 sm:flex sm:flex-wrap">
                    <span>Created {formatDate(application.created_at)}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(applicationAmount(application))}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={application.status} />
                  <PaymentBadge status={application.payment_status ?? "pending"} />
                </div>
              </div>
              
              {/* Dynamic Status Timeline Stepper */}
              <ApplicationTimeline status={application.status} />

              <div className="mt-4 flex items-center justify-between">
                <Link href={`/dashboard/applications/${application.id}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100/50">
                  <FileText className="h-3.5 w-3.5" />
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
