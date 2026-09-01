"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileWarning,
  RefreshCw,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import type { AdminDashboardPayload, DashboardWidgetItem } from "@/lib/admin/dashboard-data";
import { cn } from "@/lib/utils";

/**
 * The admin dashboard.
 *
 * It used to open with roughly thirty numbers: seven quick-action chips, six
 * "today" counters, five "action required" counters, three messaging counters,
 * a seven-button date range, five charts, four capacity counters, a signals
 * panel and an activity feed — most of them zero on a normal morning. A screen
 * that shows everything ranks nothing, and the one question it was asked
 * ("what do I do first?") was the one thing it did not answer.
 *
 * It answers that question now. One line saying whether anything is waiting,
 * then the work itself as a list you can click into, then three numbers for
 * how the day is going. Everything else it used to show has a screen of its
 * own in the sidebar, which is where it belongs.
 */
export function AdminDashboardView({ payload }: { payload: AdminDashboardPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const ar = payload.actionRequired;

  /**
   * The queue, most urgent first, with the empty rows dropped.
   *
   * A counter reading zero is not information — it is a row you read and
   * discard. Only what is actually waiting appears.
   */
  const queue = [
    {
      label: "Applications with nobody on them",
      count: ar.unassignedApplications,
      href: "/admin/applications?agent=unassigned",
      icon: ClipboardList,
    },
    { label: "Follow-ups now overdue", count: ar.overdueFollowUps, href: "/admin/leads", icon: TrendingUp },
    { label: "Documents waiting to be checked", count: ar.pendingDocuments, href: "/admin/applications", icon: FileWarning },
    { label: "Payments still due", count: ar.paymentsDue, href: "/admin/payments", icon: CreditCard },
    {
      label: "Messages that did not send",
      count: ar.failedOrConfigMessages,
      href: "/admin/communications",
      icon: FileWarning,
    },
  ].filter((row) => row.count > 0);

  const setRange = (preset: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("range", preset);
    params.delete("from");
    params.delete("to");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      {/* ── Greeting and the one thing that matters ────────────────────── */}
      <section className="lg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
              {payload.range.label}
            </p>
            <h1 className="mt-1.5 text-[1.5rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[2rem]">
              {queue.length ? "Here is what is waiting" : "Nothing is waiting"}
            </h1>
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--dc-body)] sm:text-[14.5px]">
              {queue.length
                ? "Clear these and the day is caught up."
                : "No unassigned work, no overdue follow-ups, nothing stuck. Good morning."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
              aria-label="Refresh"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--dc-ink)]/10 bg-white text-[var(--dc-body)] transition hover:text-[var(--dc-ink)] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
            </button>
            <Link
              href="/admin/customers/walk-in"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(0,29,95,0.9)] transition hover:-translate-y-px sm:px-5"
              style={{ background: "var(--dc-grad-blue)" }}
            >
              <UserPlus className="h-4 w-4" />
              New customer
            </Link>
          </div>
        </div>

        {queue.length ? (
          <ul className="mt-5 space-y-2">
            {queue.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="group flex items-center gap-3 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-3 transition hover:bg-[var(--dc-ink)]/6"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: "var(--dc-grad-flame)" }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-[13.5px] font-bold text-[var(--dc-ink)] sm:text-[14.5px]">
                      {row.count} {row.label}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-[var(--dc-blue-mid)] transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-3 text-[13.5px] font-bold text-[var(--dc-ink)]">
            <CheckCircle2 className="h-4.5 w-4.5 text-[#0f9d58]" aria-hidden="true" />
            The queue is clear.
          </p>
        )}
      </section>

      {/* ── Three numbers, not thirty ──────────────────────────────────── */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-body)]">
            How today is going
          </h2>
          <div className="flex gap-1.5">
            {[
              { preset: "today", label: "Today" },
              { preset: "last_7_days", label: "7 days" },
              { preset: "current_month", label: "Month" },
            ].map((option) => (
              <button
                key={option.preset}
                type="button"
                onClick={() => setRange(option.preset)}
                className={cn(
                  "h-8 rounded-full px-3 text-[12px] font-bold transition",
                  payload.range.preset === option.preset
                    ? "text-white"
                    : "bg-white text-[var(--dc-body)] hover:text-[var(--dc-ink)]",
                )}
                style={
                  payload.range.preset === option.preset ? { background: "var(--dc-grad-blue)" } : undefined
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Figure label="New customers" value={payload.today.walkIns} href="/admin/customers" />
          <Figure label="Applications" value={payload.today.applicationsCreated} href="/admin/applications" />
          <Figure label="New leads" value={payload.today.newLeads} href="/admin/leads" />
        </div>
      </section>

      {/* ── What actually happened, in words ───────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Feed
          title="Latest applications"
          empty="No applications in this period."
          items={payload.widgets.recentApplications.slice(0, 5)}
          href="/admin/applications"
        />
        <Feed
          title="Newest customers"
          empty="No new customers in this period."
          items={payload.widgets.recentCustomers.slice(0, 5)}
          href="/admin/customers"
        />
      </section>

      {/*
        Anything the panel could not read, said once and in plain words.
        These used to be scattered through the page as coloured chips.
      */}
      {payload.notes.length ? (
        <p className="rounded-xl border border-dashed border-[var(--dc-ink)]/15 px-3.5 py-2.5 text-[12px] font-medium text-[var(--dc-body)]">
          {payload.notes.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

function Figure({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="lg-card lg-raise block p-3.5 sm:p-4">
      <p className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--dc-ink)] tabular-nums sm:text-[2.5rem]">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] font-bold leading-snug text-[var(--dc-body)] sm:text-[12.5px]">{label}</p>
    </Link>
  );
}

function Feed({
  title,
  items,
  empty,
  href,
}: {
  title: string;
  items: DashboardWidgetItem[];
  empty: string;
  href: string;
}) {
  return (
    <div className="lg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-extrabold text-[var(--dc-ink)]">{title}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--dc-blue-mid)] hover:underline"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {items.length ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--dc-sky-soft)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[var(--dc-ink)]">{item.title}</span>
                  <span className="block truncate text-[11.5px] font-medium text-[var(--dc-body)]">
                    {item.subtitle}
                  </span>
                </span>
                {item.meta ? (
                  <span className="shrink-0 text-[11.5px] font-bold text-[var(--dc-body)]">{item.meta}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-[12.5px] font-medium text-[var(--dc-body)]">{empty}</p>
      )}
    </div>
  );
}
