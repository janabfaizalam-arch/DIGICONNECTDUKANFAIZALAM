"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileText, Search, X } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/homepage/motion";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { resolveCustomerNextAction } from "@/lib/applications/customer-next-action";
import { countApplications } from "@/lib/customer/application-summary";
import type { CustomerDashboardApplication } from "@/lib/customer-dashboard-data";
import { cn } from "@/lib/utils";

import type { CustomerPortalData } from "@/components/customer/types";
import { EmptyState, PortalButton, PortalHeading, formatDate, formatINR } from "@/components/customer/ui";

/**
 * Applications.
 *
 * The previous list rendered twice — a five-column desktop table and a
 * separate stack of mobile cards — so every change had to be made in both
 * places, and the two had already drifted: only the mobile card showed the
 * fee, only the desktop table showed the "Updated" column.
 *
 * One card, at every width. It carries everything both used to: service,
 * reference, status, payment, date, fee, and the one action that moves the
 * application forward.
 */

type Filter = "all" | "active" | "payment" | "documents" | "completed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "payment", label: "Payment due" },
  { id: "documents", label: "Documents due" },
  { id: "completed", label: "Completed" },
];

const PAGE_SIZE = 10;

function matches(application: CustomerDashboardApplication, filter: Filter) {
  const status = String(application.status ?? "").toLowerCase();
  const payment = String(application.payment_status ?? "").toLowerCase();

  switch (filter) {
    case "completed":
      return status === "completed" || status === "delivered";
    case "payment":
      return payment === "pending" || payment === "failed" || status === "payment_pending";
    case "documents":
      return status === "documents_required" || status === "document_pending";
    case "active":
      return !["completed", "delivered", "cancelled", "refunded"].includes(status);
    default:
      return true;
  }
}

function amountOf(application: CustomerDashboardApplication) {
  const value = application.total_amount ?? application.amount ?? 0;
  return Number.isFinite(value) ? value : 0;
}

export function ApplicationsSection({ applications }: CustomerPortalData) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(() => countApplications(applications), [applications]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter((application) => {
      if (!matches(application, filter)) return false;
      if (!needle) return true;
      const code = String((application as { application_code?: string }).application_code ?? "").toLowerCase();
      return (
        String(application.id).toLowerCase().includes(needle) ||
        code.includes(needle) ||
        String(application.service_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [applications, filter, query]);

  const page = filtered.slice(0, visible);

  // A count beside each filter, so the customer can see there is nothing under
  // "Payment due" without having to tap it and find an empty list.
  const countFor = (id: Filter) => {
    switch (id) {
      case "all":
        return counts.total;
      case "active":
        return counts.active;
      case "payment":
        return counts.needsPayment;
      case "documents":
        return counts.needsDocuments;
      case "completed":
        return counts.completed;
    }
  };

  if (!applications.length) {
    return (
      <div className="space-y-5">
        <PortalHeading eyebrow="Your filings" title="Applications" />
        <EmptyState
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          title="No applications yet"
          description="Pick a service and we will guide you through it — documents, fees and follow-ups included."
          actionHref="/apply"
          actionLabel="Browse services"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PortalHeading
        eyebrow="Your filings"
        title="Applications"
        description={`${filtered.length} of ${counts.total} shown.`}
        action={
          <PortalButton href="/apply" tone="flame">
            New application
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PortalButton>
        }
      />

      <div className="flex flex-col gap-3">
        <label className="lg-field flex h-12 items-center gap-2 px-4">
          <Search className="h-[17px] w-[17px] shrink-0 text-[var(--dc-muted)]" aria-hidden="true" />
          <span className="sr-only">Search your applications</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search by service or reference"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[var(--dc-ink)] outline-none placeholder:text-[var(--dc-muted)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--dc-muted)] transition hover:bg-[var(--dc-blue-soft)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div className="-mx-[var(--mobile-page-gutter)] overflow-x-auto px-[var(--mobile-page-gutter)] pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5" role="group" aria-label="Filter applications">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              const count = countFor(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFilter(item.id);
                    setVisible(PAGE_SIZE);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-extrabold transition duration-300",
                    active ? "text-white" : "lg-pill lg-raise text-[var(--dc-blue-mid)]",
                  )}
                  style={active ? { background: "var(--dc-grad-blue)" } : undefined}
                >
                  {item.label}
                  <span className={cn("text-[11px]", active ? "text-white/70" : "text-[var(--dc-muted)]")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {page.length ? (
        <>
          <Stagger as="ul" className="space-y-2.5">
            {page.map((application) => {
              const next = resolveCustomerNextAction({
                applicationId: application.id,
                status: application.status,
                paymentStatus: application.payment_status,
                missingDocuments:
                  application.status === "documents_required" || application.status === "document_pending",
              });
              const fee = amountOf(application);

              return (
                <StaggerItem as="li" key={application.id}>
                  <article className="lg-card lg-raise lg-sheen p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-extrabold text-[var(--dc-ink)]">
                          {application.service_name}
                        </h3>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--dc-muted)]">
                          {application.id}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge status={application.status} />
                        <PaymentBadge status={application.payment_status ?? "pending"} />
                      </div>
                    </div>

                    <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
                      <div className="flex gap-1.5">
                        <dt className="font-semibold text-[var(--dc-muted)]">Applied</dt>
                        <dd className="font-bold text-[var(--dc-body)]">{formatDate(application.created_at)}</dd>
                      </div>
                      {fee > 0 ? (
                        <div className="flex gap-1.5">
                          <dt className="font-semibold text-[var(--dc-muted)]">Fee</dt>
                          <dd className="font-bold text-[var(--dc-body)]">{formatINR(fee)}</dd>
                        </div>
                      ) : null}
                    </dl>

                    <div className="mt-3.5 flex gap-2">
                      <Link
                        href={`/customer/applications/${application.id}`}
                        className="lg-pill lg-raise inline-flex h-10 flex-1 items-center justify-center gap-1.5 text-[13px] font-extrabold text-[var(--dc-blue-mid)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        Details
                      </Link>
                      {/* Only when it differs from Details — otherwise the card
                          offers the same destination twice. */}
                      {next.href !== `/customer/applications/${application.id}` ? (
                        <Link
                          href={next.href}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-extrabold text-white transition duration-300 hover:brightness-110"
                          style={{
                            background:
                              next.key === "pay_now" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)",
                          }}
                        >
                          {next.label}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>

          {visible < filtered.length ? (
            <PortalButton onClick={() => setVisible((count) => count + PAGE_SIZE)} tone="ghost" className="w-full">
              Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
            </PortalButton>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden="true" />}
          title="Nothing matches"
          description={
            query.trim()
              ? `No application matches “${query.trim()}”. Try the reference number, or a different service name.`
              : "No application is in this state right now."
          }
        />
      )}
    </div>
  );
}
