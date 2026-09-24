// ============================================================================
// DC Partner home — analytics
//
// Everything the charts, the KPI row and the attention strip plot is derived
// here, from one list of applications and nothing else. Pure functions, no
// Supabase, no Date.now() unless it is handed in — so every number the partner
// reads has a test behind it.
// ============================================================================

import { getApplicationStatusLabel } from "@/lib/application-status";
import { formatINR, formatPercentDelta } from "@/lib/ap/format";
import type {
  PartnerAnalytics,
  PartnerAttentionItem,
  PartnerKpi,
  PartnerServiceMixItem,
  PartnerStatusBucket,
  PartnerStatusMixItem,
  PartnerTrendPoint,
} from "@/lib/ap/home-types";

/** The only shape the analytics need. Keeps the module free of the row type. */
export type AnalyticsApplication = {
  id: string;
  amount: number | null;
  status: string;
  payment_status?: string | null;
  service_name?: string | null;
  created_at: string;
  updated_at?: string | null;
};

/** How many days the trend charts cover. */
export const TREND_RANGE_DAYS = 14;

/**
 * Services shown individually before the tail is folded into "Other".
 *
 * Five, because the categorical palette is assigned in fixed order and never
 * cycled — a sixth service would have to invent a hue. The tail keeps its
 * totals; it just stops claiming an identity of its own.
 */
export const SERVICE_MIX_LIMIT = 5;

const PAID_PAYMENT_STATUSES = new Set(["paid", "success", "completed", "captured", "verified"]);
const UNPAID_PAYMENT_STATUSES = new Set(["pending", "unpaid", "failed", ""]);

const STATUS_BUCKETS: Record<PartnerStatusBucket, { label: string; statuses: string[] }> = {
  awaiting_payment: { label: "Awaiting payment", statuses: ["draft", "payment_pending"] },
  action_needed: {
    label: "Action needed",
    statuses: ["documents_required", "document_pending", "objection"],
  },
  in_progress: {
    label: "In progress",
    statuses: ["payment_success", "submitted", "documents_verified", "assigned_to_agent", "in_progress"],
  },
  completed: { label: "Completed", statuses: ["completed", "delivered"] },
  closed: { label: "Closed", statuses: ["rejected", "cancelled", "refunded"] },
};

/** Fixed render order — the status legend never reshuffles between loads. */
export const STATUS_BUCKET_ORDER: PartnerStatusBucket[] = [
  "action_needed",
  "awaiting_payment",
  "in_progress",
  "completed",
  "closed",
];

export function safeAmount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function isPaid(paymentStatus: string | null | undefined): boolean {
  return PAID_PAYMENT_STATUSES.has(String(paymentStatus ?? "").trim().toLowerCase());
}

export function isUnpaid(paymentStatus: string | null | undefined): boolean {
  return UNPAID_PAYMENT_STATUSES.has(String(paymentStatus ?? "pending").trim().toLowerCase());
}

/**
 * Which bucket a status falls in.
 *
 * An unknown or legacy status counts as in progress rather than vanishing —
 * a chart that silently drops rows is worse than one that groups them roughly.
 */
export function statusBucket(status: string): PartnerStatusBucket {
  const value = String(status ?? "").trim().toLowerCase();
  for (const key of STATUS_BUCKET_ORDER) {
    if (STATUS_BUCKETS[key].statuses.includes(value)) return key;
  }
  return "in_progress";
}

export function statusBucketLabel(key: PartnerStatusBucket): string {
  return STATUS_BUCKETS[key].label;
}

/** Local midnight, as an ISO string — the key every day bucket is filed under. */
export function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

/** When money actually landed: the last update if there is one, else creation. */
function settledAt(app: AnalyticsApplication): string {
  return app.updated_at || app.created_at;
}

/**
 * One point per day for the last `days` days, oldest first, including the days
 * with nothing on them — a gap in a time series has to read as a zero, not as
 * a missing point the line hops over.
 */
export function buildTrend(
  apps: AnalyticsApplication[],
  options?: { days?: number; now?: Date },
): PartnerTrendPoint[] {
  const days = Math.max(1, options?.days ?? TREND_RANGE_DAYS);
  const now = options?.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const points: PartnerTrendPoint[] = [];
  const index = new Map<string, PartnerTrendPoint>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const point: PartnerTrendPoint = {
      date: date.toISOString(),
      label: dayLabel(date),
      applications: 0,
      collection: 0,
    };
    points.push(point);
    index.set(point.date, point);
  }

  for (const app of apps) {
    const createdPoint = index.get(dayKey(app.created_at));
    if (createdPoint) createdPoint.applications += 1;

    if (isPaid(app.payment_status)) {
      const paidPoint = index.get(dayKey(settledAt(app)));
      if (paidPoint) paidPoint.collection += safeAmount(app.amount);
    }
  }

  return points;
}

/**
 * Applications and money per service, biggest first, with everything past
 * `limit` folded into a single "Other" row that keeps its totals.
 */
export function buildServiceMix(
  apps: AnalyticsApplication[],
  options?: { limit?: number },
): PartnerServiceMixItem[] {
  const limit = Math.max(1, options?.limit ?? SERVICE_MIX_LIMIT);
  const totals = new Map<string, PartnerServiceMixItem>();

  for (const app of apps) {
    const name = (app.service_name || "").trim() || "Other service";
    const current = totals.get(name) ?? { name, applications: 0, amount: 0 };
    current.applications += 1;
    if (isPaid(app.payment_status)) current.amount += safeAmount(app.amount);
    totals.set(name, current);
  }

  const ranked = [...totals.values()].sort(
    (a, b) => b.applications - a.applications || b.amount - a.amount || a.name.localeCompare(b.name),
  );

  if (ranked.length <= limit) return ranked;

  const head = ranked.slice(0, limit);
  const tail = ranked.slice(limit);

  head.push({
    name: "Other",
    applications: tail.reduce((sum, item) => sum + item.applications, 0),
    amount: tail.reduce((sum, item) => sum + item.amount, 0),
  });

  return head;
}

/** Status split in fixed bucket order. Empty buckets are dropped, not zeroed. */
export function buildStatusMix(apps: AnalyticsApplication[]): PartnerStatusMixItem[] {
  const counts = new Map<PartnerStatusBucket, number>();

  for (const app of apps) {
    const key = statusBucket(app.status);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return STATUS_BUCKET_ORDER.filter((key) => (counts.get(key) ?? 0) > 0).map((key) => ({
    key,
    label: statusBucketLabel(key),
    count: counts.get(key) ?? 0,
  }));
}

export function buildAnalytics(
  apps: AnalyticsApplication[],
  options?: { days?: number; now?: Date; serviceLimit?: number },
): PartnerAnalytics {
  const days = Math.max(1, options?.days ?? TREND_RANGE_DAYS);
  const now = options?.now ?? new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - (days - 1));

  const inRange = apps.filter((app) => new Date(app.created_at) >= cutoff);
  const trend = buildTrend(apps, { days, now });

  return {
    rangeDays: days,
    trend,
    serviceMix: buildServiceMix(inRange, { limit: options?.serviceLimit }),
    statusMix: buildStatusMix(apps),
    rangeApplications: trend.reduce((sum, point) => sum + point.applications, 0),
    rangeCollection: trend.reduce((sum, point) => sum + point.collection, 0),
    isEmpty: apps.length === 0,
  };
}

/** Last `count` days of a trend series, for a KPI sparkline. */
export function sparkFrom(
  trend: PartnerTrendPoint[],
  metric: "applications" | "collection",
  count = 12,
): number[] {
  return trend.slice(-count).map((point) => point[metric]);
}

type KpiInput = {
  trend: PartnerTrendPoint[];
  todayApplications: number;
  yesterdayApplications: number;
  todayCollection: number;
  yesterdayCollection: number;
  pendingApplications: number;
  pendingPayments: number;
  pendingCollection: number;
  commissionEarned: number;
  commissionPending: number;
};

/**
 * The four headline numbers, and only those four.
 *
 * Each one appears exactly once on the page: anything a KPI already states is
 * not repeated by a tile further down. Collection and commission carry a
 * comparison against yesterday; the queues carry the money still owed instead,
 * because "pending vs yesterday" is noise, not a signal.
 */
export function buildKpis(input: KpiInput): PartnerKpi[] {
  const collectionDelta = formatPercentDelta(input.todayCollection, input.yesterdayCollection);
  const applicationsDelta = formatPercentDelta(input.todayApplications, input.yesterdayApplications);

  return [
    {
      key: "today-collection",
      label: "Collected today",
      value: formatINR(input.todayCollection),
      href: "/ap/payments/collect",
      tone: "success",
      delta: { ...collectionDelta, caption: "vs yesterday" },
      spark: sparkFrom(input.trend, "collection"),
    },
    {
      key: "today-applications",
      label: "Applications today",
      value: String(input.todayApplications),
      href: "/ap/applications",
      tone: "default",
      delta: { ...applicationsDelta, caption: "vs yesterday" },
      spark: sparkFrom(input.trend, "applications"),
    },
    {
      key: "open-work",
      label: "Open applications",
      value: String(input.pendingApplications),
      href: "/ap/applications",
      tone: input.pendingApplications > 0 ? "pending" : "default",
      delta: null,
      spark: [],
    },
    {
      key: "commission-earned",
      label: "Commission earned",
      value: formatINR(input.commissionEarned),
      href: "/ap/commissions",
      tone: "default",
      delta:
        input.commissionPending > 0
          ? { label: formatINR(input.commissionPending), tone: "flat", caption: "still pending" }
          : null,
      spark: [],
    },
  ];
}

/**
 * What needs the partner today, worst first, capped at three.
 *
 * The strip is an interrupt, so it stays short: past three rows people stop
 * reading it and it becomes another list. Everything it names is also in the
 * work queue below — the strip is the shortcut, not a second source of truth.
 */
export function buildAttention(
  apps: AnalyticsApplication[],
  options?: { now?: Date },
): PartnerAttentionItem[] {
  const now = options?.now ?? new Date();
  const items: PartnerAttentionItem[] = [];

  const actionNeeded = apps.filter((app) => statusBucket(app.status) === "action_needed");
  const unpaid = apps.filter(
    (app) => isUnpaid(app.payment_status) && !["completed", "delivered", "rejected", "cancelled", "refunded"].includes(app.status),
  );
  const unpaidTotal = unpaid.reduce((sum, app) => sum + safeAmount(app.amount), 0);

  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - 7);
  const stale = apps.filter(
    (app) => statusBucket(app.status) === "in_progress" && new Date(settledAt(app)) < staleCutoff,
  );

  if (actionNeeded.length) {
    items.push({
      id: "attention-documents",
      severity: "critical",
      title: `${actionNeeded.length} application${actionNeeded.length === 1 ? "" : "s"} blocked on documents`,
      detail: "Upload or fix the pending papers to get these moving again.",
      ctaLabel: "Fix now",
      href: "/ap/applications",
    });
  }

  if (unpaid.length) {
    items.push({
      id: "attention-payments",
      severity: "warning",
      title: `${formatINR(unpaidTotal)} still to collect`,
      detail: `${unpaid.length} application${unpaid.length === 1 ? "" : "s"} waiting on payment.`,
      ctaLabel: "Collect",
      href: "/ap/payments/collect",
    });
  }

  if (stale.length) {
    items.push({
      id: "attention-stale",
      severity: "info",
      title: `${stale.length} application${stale.length === 1 ? "" : "s"} untouched for a week`,
      detail: "Nothing has moved on these for seven days or more.",
      ctaLabel: "Review",
      href: "/ap/applications",
    });
  }

  return items.slice(0, 3);
}

/** A one-line human summary of the status split, for screen readers. */
export function describeStatusMix(items: PartnerStatusMixItem[]): string {
  if (!items.length) return "No applications yet.";
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const parts = items.map((item) => `${item.label} ${item.count}`);
  return `${total} application${total === 1 ? "" : "s"}: ${parts.join(", ")}.`;
}

export function getApplicationStatusText(status: string): string {
  return getApplicationStatusLabel(status);
}
