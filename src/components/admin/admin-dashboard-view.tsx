"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileWarning,
  Handshake,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { AdminTrendChart, type TrendSeries } from "@/components/admin/admin-trend-chart";
import type { AdminDashboardPayload, DashboardMetric, DashboardWidgetItem } from "@/lib/admin/dashboard-data";
import { cn } from "@/lib/utils";

/**
 * The admin home page.
 *
 * It opens with the one question an agent has at nine in the morning: what do
 * I do first. Everything on this screen is ordered by how much it deserves to
 * be the answer — the queue of work that is actually waiting, then how the
 * period is going, then what happened recently, then whether the machinery
 * behind it is healthy. A screen that shows everything ranks nothing, so a
 * counter reading zero never takes up a row.
 *
 * What changed here, beyond the paint: the server was already computing
 * period-over-period deltas, six chart series, messaging health and four more
 * widget lists, and this page used none of it. Ten database reads a load went
 * into numbers nobody saw. They are shown now — ranked, not dumped.
 */

/** Ranked highest-consequence first: money that failed beats a headcount. */
const FEATURED_METRICS = [
  "revenue_period",
  "period_applications",
  "new_customers",
  "pending_applications",
  "failed_payments",
] as const;

export function AdminDashboardView({ payload }: { payload: AdminDashboardPayload }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const still = useReducedMotion();

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
      tone: "danger" as const,
    },
    {
      label: "Follow-ups now overdue",
      count: ar.overdueFollowUps,
      href: "/admin/leads",
      icon: TrendingUp,
      tone: "danger" as const,
    },
    {
      label: "Documents waiting to be checked",
      count: ar.pendingDocuments,
      href: "/admin/applications",
      icon: FileWarning,
      tone: "warn" as const,
    },
    {
      label: "Payments still due",
      count: ar.paymentsDue,
      href: "/admin/payments",
      icon: CreditCard,
      tone: "warn" as const,
    },
    {
      label: "Partner applications to approve",
      count: payload.workload.pendingPartnerApprovals,
      href: "/admin/partner-applications",
      icon: Handshake,
      tone: "warn" as const,
    },
    {
      label: "Messages that did not send",
      count: ar.failedOrConfigMessages,
      href: "/admin/communications",
      icon: ShieldAlert,
      tone: "warn" as const,
    },
  ].filter((row) => row.count > 0);

  const metrics = useMemo(() => {
    const byId = new Map(payload.metrics.map((metric) => [metric.id, metric]));
    return FEATURED_METRICS.map((id) => byId.get(id)).filter(Boolean) as DashboardMetric[];
  }, [payload.metrics]);

  const trends = useMemo<TrendSeries[]>(() => {
    const out: TrendSeries[] = [];
    if (payload.charts.applicationsTrend.length) {
      out.push({
        id: "applications",
        label: "Applications",
        colour: "#0f5db8",
        points: payload.charts.applicationsTrend.map((row) => ({
          label: row.label,
          value: row.applications,
        })),
      });
    }
    if (payload.charts.revenueTrend.length) {
      out.push({
        id: "revenue",
        label: "Revenue",
        colour: "#f25a00",
        money: true,
        points: payload.charts.revenueTrend.map((row) => ({ label: row.label, value: row.revenue })),
      });
    }
    return out;
  }, [payload.charts]);

  const setRange = (preset: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("range", preset);
    params.delete("from");
    params.delete("to");
    startTransition(() => router.push(`/admin?${params.toString()}`));
  };

  const rise = (index: number) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: index * 0.045, type: "spring" as const, stiffness: 380, damping: 32 },
        };

  return (
    <div className="relative mx-auto max-w-[1400px] pb-10">
      <Stage />

      <div className="relative space-y-4">
        {/* ── What is waiting ──────────────────────────────────────────── */}
        <motion.section {...rise(0)} className="lg-card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
                {payload.range.label}
              </p>
              <h1 className="mt-1.5 text-[1.5rem] font-extrabold leading-[1.08] tracking-[-0.025em] text-[var(--dc-ink)] sm:text-[2.1rem]">
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

          <AnimatePresence initial={false}>
            {queue.length ? (
              <ul className="mt-5 space-y-2">
                {queue.map((row, index) => {
                  const Icon = row.icon;
                  return (
                    <motion.li
                      key={row.label}
                      initial={still ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: still ? 0 : 0.06 + index * 0.05 }}
                    >
                      <Link
                        href={row.href}
                        className="group flex items-center gap-3 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-3 transition hover:bg-[var(--dc-ink)]/6"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{
                            background:
                              row.tone === "danger" ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)",
                          }}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-[13.5px] font-bold text-[var(--dc-ink)] sm:text-[14.5px]">
                          <span className="tabular-nums">{row.count}</span> {row.label}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-[var(--dc-blue-mid)] transition group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--dc-sky-soft)] px-3.5 py-3 text-[13.5px] font-bold text-[var(--dc-ink)]">
                <CheckCircle2 className="h-4.5 w-4.5 text-[#0f9d58]" aria-hidden="true" />
                The queue is clear.
              </p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── How the period is going ──────────────────────────────────── */}
        <motion.section {...rise(1)}>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-body)]">
              How {payload.range.label.toLowerCase()} is going
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
                  aria-pressed={payload.range.preset === option.preset}
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

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            {metrics.map((metric, index) => (
              <MetricCard key={metric.id} metric={metric} index={index} still={Boolean(still)} />
            ))}
          </div>
        </motion.section>

        {/* ── The shape of it ──────────────────────────────────────────── */}
        {trends.length ? (
          <motion.div {...rise(2)}>
            <AdminTrendChart series={trends} />
          </motion.div>
        ) : null}

        {/* ── What actually happened ───────────────────────────────────── */}
        <motion.section {...rise(3)} className="grid gap-3 lg:grid-cols-2">
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
        </motion.section>

        {/* ── Is the machinery behind it healthy ───────────────────────── */}
        <motion.div {...rise(4)}>
          <SystemHealth payload={payload} />
        </motion.div>

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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The blue behind the top of the page.
 *
 * One painted gradient, not a stack of blurred layers: this screen is opened
 * on branch laptops all day and a full-page backdrop-filter costs more frames
 * than the depth is worth.
 */
function Stage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-56 overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(120% 100% at 10% -20%, #2f80ed 0%, #0f5db8 45%, rgba(15,93,184,0) 100%)",
        }}
      />
      <div
        className="absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-[0.10]"
        style={{ background: "radial-gradient(circle, #f25a00 0%, rgba(242,90,0,0) 70%)" }}
      />
    </div>
  );
}

/**
 * A number with its own history attached.
 *
 * The delta was already being computed on the server for every metric and
 * thrown away here, which meant the page could tell you there were nine
 * applications but not whether nine was a good morning or a bad one.
 */
function MetricCard({
  metric,
  index,
  still,
}: {
  metric: DashboardMetric;
  index: number;
  still: boolean;
}) {
  const { delta } = metric;
  const moved = delta.percent !== null && delta.absolute !== 0;
  const good = delta.absolute > 0 === metric.increaseIsGood;

  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: still ? 0 : 0.05 + index * 0.04 }}
    >
      <Link href={metric.href} className="lg-card lg-raise block h-full p-3.5 sm:p-4">
        <p className="truncate text-[11px] font-bold leading-snug text-[var(--dc-body)]">{metric.title}</p>
        <p className="mt-1 text-[1.6rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--dc-ink)] tabular-nums sm:text-[1.9rem]">
          {metric.value}
        </p>
        {moved ? (
          <p
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold",
              good ? "text-[#0f9d58]" : "text-[#c9430a]",
            )}
          >
            {delta.absolute > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {Math.abs(delta.percent ?? 0)}%
            <span className="font-medium text-[var(--dc-body)]">{delta.label}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] font-medium text-[var(--dc-body)]">{delta.label}</p>
        )}
      </Link>
    </motion.div>
  );
}

/**
 * The machinery, and only when it has something to say.
 *
 * Four counters that read zero on a good day were the reason this panel felt
 * noisy. One green line when everything is fine; the rows appear only when
 * one of them is not.
 */
function SystemHealth({ payload }: { payload: AdminDashboardPayload }) {
  const { health } = payload;

  const problems = [
    { label: "Ops alerts open", count: health.openOpsAlerts, href: "/admin/communications" },
    { label: "Messages queued", count: health.queuedMessages, href: "/admin/communications" },
    {
      label: "Messages needing configuration",
      count: health.configRequiredMessages,
      href: "/admin/settings",
    },
    { label: "Automation runs pending", count: health.automationPending, href: "/admin/automation" },
  ].filter((row) => row.count > 0);

  return (
    <section className="lg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--dc-ink)]">
          <Activity className="h-4 w-4 text-[var(--dc-blue-mid)]" aria-hidden="true" />
          System
        </h2>
        <span className="text-[11.5px] font-bold text-[var(--dc-body)]">{health.messagingModeLabel}</span>
      </div>

      {problems.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {problems.map((row) => (
            <li key={row.label}>
              <Link
                href={row.href}
                className="flex items-center gap-2.5 rounded-xl bg-[var(--dc-sky-soft)] px-3 py-2.5 transition hover:bg-[var(--dc-ink)]/6"
              >
                <span className="text-[15px] font-extrabold tabular-nums text-[var(--dc-ink)]">
                  {row.count}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[var(--dc-body)]">
                  {row.label}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-bold text-[var(--dc-ink)]">
          <CheckCircle2 className="h-4 w-4 text-[#0f9d58]" aria-hidden="true" />
          Messaging and automation are running clean.
        </p>
      )}

      {payload.alertsSourceError ? (
        <p className="mt-2.5 text-[11.5px] font-medium text-[var(--dc-body)]">
          Alert history could not be read just now, so this may be incomplete.
        </p>
      ) : null}
    </section>
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
