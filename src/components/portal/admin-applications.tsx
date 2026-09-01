"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  MessageCircle,
  Pencil,
  ReceiptText,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { useToast } from "@/components/providers/toast-provider";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeCurrency, safeDateTime } from "@/lib/admin-format";
import { applicationReference } from "@/lib/applications/reference";
import { APPLICATION_STATUS_OPTIONS } from "@/lib/application-status";
import type { AdminApplicationsCommandStats, AdminApplicationsFilterOptions } from "@/lib/admin-crm";
import type { AdminApplicationRow, PortalUser } from "@/lib/portal-types";
import { cn } from "@/lib/utils";
import { buildAdminCustomerWhatsAppMessage, buildCustomerWhatsAppUrl } from "@/lib/whatsapp";

/**
 * The applications queue.
 *
 * It used to be five counter cards above a ten-column table, with three
 * buttons stacked in every row and an Apply button that had to be pressed
 * before any filter took effect. On a phone the table scrolled sideways past
 * the columns that mattered; on a desktop the eye travelled the full width to
 * pair a name with its status.
 *
 * Two changes carry most of the difference.
 *
 * The counters *are* the filter. "102 unassigned" was a number you read and
 * then went looking for a dropdown to act on; it is the button that shows you
 * those 102 now, which is what anybody was going to do with it anyway.
 *
 * Every application is one card rather than a row of ten cells — the customer,
 * what they asked for, where it has reached and what it is worth, in the order
 * somebody says it aloud. The card is the link; the two things you do without
 * opening it, message the customer and reach the invoice, are icon buttons on
 * it. Nothing scrolls sideways at any width.
 */

const DATE_RANGES = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

type FiltersState = {
  query: string;
  status: string;
  paymentStatus: string;
  agentId: string;
  dateRange: string;
};

function rowHref(row: AdminApplicationRow) {
  return row.application_id ? `/admin/applications/${row.application_id}` : "/admin/applications";
}

function invoiceHref(row: AdminApplicationRow) {
  return row.invoice_id ? `/invoice/${row.invoice_id}` : rowHref(row);
}

function whatsappHref(row: AdminApplicationRow) {
  return buildCustomerWhatsAppUrl(
    buildAdminCustomerWhatsAppMessage({
      applicationId: row.application_id ?? row.id,
      serviceName: row.service,
      customerName: row.customer_name,
      kind: "general",
    }),
    row.mobile,
  );
}

function pageHref(page: number, filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all") params.set("payment", filters.paymentStatus);
  if (filters.agentId !== "all") {
    params.set("agent", filters.agentId === "none" ? "unassigned" : `agent:${filters.agentId}`);
  }
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/applications?${suffix}` : "/admin/applications";
}

export function AdminApplications({
  rows,
  agents = [],
  total,
  page,
  pageSize,
  initialSearch = "",
  initialStatus = "all",
  initialPaymentStatus = "all",
  initialAgentId = "all",
  initialDateRange = "all",
  stats,
  filterOptions,
}: {
  rows: AdminApplicationRow[];
  agents?: PortalUser[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch?: string;
  initialStatus?: string;
  initialPaymentStatus?: string;
  initialService?: string;
  initialAgentId?: string;
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
  const [showMore, setShowMore] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    query: initialSearch,
    status: initialStatus || "all",
    paymentStatus: initialPaymentStatus || "all",
    agentId: initialAgentId || "all",
    dateRange: initialDateRange || "all",
  });

  const agentOptions = useMemo(
    () => agents.map((item) => ({ id: item.id, label: item.full_name || item.email || item.agent_code || item.id })),
    [agents],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const go = (next: FiltersState, nextPage = 1) => {
    setFilters(next);
    startTransition(() => router.push(pageHref(nextPage, next)));
  };

  /**
   * The counters, as the filter.
   *
   * Each is a view of the queue rather than a statistic about it, so the
   * active one is pressed rather than merely coloured.
   */
  const views = [
    { key: "all", label: "Everything", count: stats.totalApplications, status: "all", agentId: "all" },
    { key: "unassigned", label: "Needs assigning", count: stats.unassignedApplications, status: "all", agentId: "none" },
    { key: "payment", label: "Payment pending", count: stats.paymentPending, status: "payment_pending", agentId: "all" },
    { key: "progress", label: "In progress", count: stats.inProgress, status: "in_progress", agentId: "all" },
    { key: "done", label: "Completed", count: stats.completed, status: "completed", agentId: "all" },
  ] as const;

  const activeView =
    views.find((view) => view.status === filters.status && view.agentId === filters.agentId)?.key ?? null;

  const extraFilters =
    (filters.paymentStatus !== "all" ? 1 : 0) +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.agentId !== "all" && filters.agentId !== "none" ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[1.9rem]">
            Applications
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[var(--dc-body)] sm:text-[14px]">
            {total} in this view. Tap one to open it.
          </p>
        </div>
        <Link
          href="/ap/applications/new"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(0,29,95,0.9)] transition hover:-translate-y-px"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          New application
        </Link>
      </div>

      {/* ── The views ─────────────────────────────────────────────────── */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {views.map((view) => {
          const active = activeView === view.key;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => go({ ...filters, status: view.status, agentId: view.agentId })}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left transition",
                active ? "text-white shadow-[0_12px_26px_-16px_rgba(0,29,95,0.9)]" : "lg-card",
              )}
              style={active ? { background: "var(--dc-grad-blue)" } : undefined}
            >
              <span className="text-[1.15rem] font-extrabold leading-none tabular-nums">{view.count}</span>
              <span
                className={cn(
                  "text-[12.5px] font-bold leading-tight",
                  active ? "text-white/85" : "text-[var(--dc-body)]",
                )}
              >
                {view.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            go(filters);
          }}
          className="flex gap-2"
        >
          <label className="relative block min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dc-body)]"
              aria-hidden="true"
            />
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Name, mobile, service…"
              aria-label="Search applications"
              className="lg-field h-12 w-full rounded-xl pl-10 pr-3.5 text-[14px] font-semibold text-[var(--dc-ink)] outline-none placeholder:font-medium placeholder:text-[var(--dc-body)] focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]/40"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            aria-expanded={showMore}
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition",
              showMore || extraFilters ? "text-white" : "lg-card text-[var(--dc-body)]",
            )}
            style={showMore || extraFilters ? { background: "var(--dc-grad-blue)" } : undefined}
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
            {extraFilters && !showMore ? (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                {extraFilters}
              </span>
            ) : null}
          </button>
        </form>

        {/* The three filters that are reached for rarely, folded away rather
            than sitting across the top of the screen every day. */}
        {showMore ? (
          <div className="lg-card grid gap-2.5 p-3 sm:grid-cols-3">
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => go({ ...filters, paymentStatus: value })}
              disabled={isPending}
            >
              <SelectTrigger aria-label="Payment" className="h-11">
                <SelectValue placeholder="Any payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any payment</SelectItem>
                {filterOptions.paymentStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.agentId}
              onValueChange={(value) => go({ ...filters, agentId: value })}
              disabled={isPending}
            >
              <SelectTrigger aria-label="Assigned to" className="h-11">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone</SelectItem>
                <SelectItem value="none">Nobody yet</SelectItem>
                {agentOptions.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) => go({ ...filters, dateRange: value })}
              disabled={isPending}
            >
              <SelectTrigger aria-label="When" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {/* What is currently narrowing the list, and one tap to drop it. */}
        {filters.query || extraFilters ? (
          <button
            type="button"
            onClick={() =>
              go({ query: "", status: filters.status, paymentStatus: "all", agentId: filters.agentId === "none" ? "none" : "all", dateRange: "all" })
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dc-sky-soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--dc-body)] transition hover:text-[var(--dc-ink)]"
          >
            <X className="h-3.5 w-3.5" />
            Clear search and filters
          </button>
        ) : null}
      </div>

      {/* ── The queue ─────────────────────────────────────────────────── */}
      {isPending ? (
        <p className="flex items-center justify-center gap-2 py-8 text-[13px] font-bold text-[var(--dc-body)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading…
        </p>
      ) : rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <ApplicationCard row={row} agents={agentOptions} />
            </li>
          ))}
        </ul>
      ) : (
        <AdminEmptyState
          title="Nothing here"
          description="No application matches this view. Try another view above, or clear the search."
        />
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3 pt-1" aria-label="Pages">
          <Link
            href={pageHref(Math.max(1, page - 1), filters)}
            aria-disabled={page <= 1}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold transition",
              page <= 1 ? "pointer-events-none opacity-40" : "lg-card text-[var(--dc-ink)]",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-[12.5px] font-bold text-[var(--dc-body)]">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1), filters)}
            aria-disabled={page >= totalPages}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold transition",
              page >= totalPages ? "pointer-events-none opacity-40" : "lg-card text-[var(--dc-ink)]",
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   One application
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The card is the link, so the whole thing is the tap target rather than a
 * "View" button inside a row. The two actions worth taking without opening it
 * sit on top of that link and stop the click from propagating.
 */
function ApplicationCard({
  row,
  agents,
}: {
  row: AdminApplicationRow;
  agents: { id: string; label: string }[];
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [saving, setSaving] = useState<null | "status" | "agent">(null);
  const [open, setOpen] = useState(false);

  const whatsapp = whatsappHref(row);
  const amount = row.total_amount ?? row.payment_amount;
  const unassigned = !row.agent_name;
  const reference = applicationReference(row);

  /**
   * Change something without leaving the list.
   *
   * Moving one file forward used to be: open it, find the sidebar, change the
   * dropdown, press Save Changes, go back. For a queue of a hundred that is
   * five hundred clicks. The two fields that actually move work — where it has
   * reached and who is on it — are on the card.
   */
  const patch = async (field: "status" | "agent", value: string) => {
    const target = row.application_id ?? row.id;
    setSaving(field);
    try {
      const response = await fetch(`/api/admin/applications/${target}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "status" ? { status: value } : { assignedAgentId: value }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message || "Could not save.");
      }
      success(field === "status" ? "Status updated." : "Assigned.");
      router.refresh();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="lg-card lg-raise relative">
      <Link href={rowHref(row)} className="block p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-extrabold leading-tight text-[var(--dc-ink)] sm:text-[15.5px]">
              {row.customer_name || "Customer"}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-[var(--dc-body)]">
              {row.service}
            </p>
            {/* Readable, sayable, and it already tells you the service and
                the day before you open anything. */}
            <p className="mt-1 font-mono text-[11px] font-bold tracking-tight text-[var(--dc-blue-mid)]">
              {reference}
            </p>
          </div>

          {/* Room kept clear for the action buttons pinned at the corner. */}
          <div className="w-[4.75rem] shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <AdminStatusBadge status={row.application_status} />
          {amount ? (
            <span className="text-[13px] font-extrabold text-[var(--dc-ink)] tabular-nums">
              {safeCurrency(amount)}
            </span>
          ) : null}
          {row.payment_status ? (
            <span className="text-[12px] font-bold capitalize text-[var(--dc-body)]">
              {row.payment_status.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-semibold text-[var(--dc-body)]">
          {row.mobile ? <span className="tabular-nums">{row.mobile}</span> : null}
          <span aria-hidden="true">·</span>
          <span>{safeDateTime(row.created_at)}</span>
          <span aria-hidden="true">·</span>
          {unassigned ? (
            <span className="font-extrabold text-[var(--dc-flame)]">Nobody assigned</span>
          ) : (
            <span>{row.agent_name}</span>
          )}
        </div>
      </Link>

      {/* ── Act without opening it ─────────────────────────────────── */}
      <div className="border-t border-[var(--dc-ink)]/8 px-3.5 py-2.5 sm:px-4">
        {open ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-body)]">
                Move to
              </span>
              <select
                value={row.application_status}
                disabled={saving !== null}
                onChange={(event) => patch("status", event.target.value)}
                className="lg-field h-10 w-full rounded-lg px-2.5 text-[13px] font-bold text-[var(--dc-ink)] outline-none disabled:opacity-50"
              >
                {APPLICATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-body)]">
                Assign to
              </span>
              <select
                value={row.agent_id ?? ""}
                disabled={saving !== null}
                onChange={(event) => patch("agent", event.target.value)}
                className="lg-field h-10 w-full rounded-lg px-2.5 text-[13px] font-bold text-[var(--dc-ink)] outline-none disabled:opacity-50"
              >
                <option value="">Nobody yet</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--dc-blue-mid)] transition hover:underline"
          >
            {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            Change status or assign
          </button>
        )}
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Message ${row.customer_name || "the customer"} on WhatsApp`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/12 text-[#128C7E] transition hover:bg-[#25D366]/20"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : (
          <span
            title="No mobile number on this application"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dc-ink)]/5 text-[var(--dc-body)]/40"
          >
            <MessageCircle className="h-4 w-4" />
          </span>
        )}
        <Link
          href={invoiceHref(row)}
          aria-label={row.invoice_id ? "Open the invoice" : "Generate an invoice"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dc-ink)]/5 text-[var(--dc-blue-mid)] transition hover:bg-[var(--dc-ink)]/10"
        >
          {row.invoice_id ? <ReceiptText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </Link>
      </div>
    </div>
  );
}
