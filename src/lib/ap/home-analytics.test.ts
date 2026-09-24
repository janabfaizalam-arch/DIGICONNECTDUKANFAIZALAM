import { describe, expect, it } from "vitest";

import {
  buildAnalytics,
  buildAttention,
  buildKpis,
  buildServiceMix,
  buildStatusMix,
  buildTrend,
  describeStatusMix,
  sparkFrom,
  statusBucket,
  type AnalyticsApplication,
} from "@/lib/ap/home-analytics";

const NOW = new Date(2026, 8, 24, 13, 47); // 24 Sep 2026, local

function app(overrides: Partial<AnalyticsApplication> & { created_at: string }): AnalyticsApplication {
  return {
    id: Math.random().toString(36).slice(2),
    amount: 1000,
    status: "submitted",
    payment_status: "paid",
    service_name: "GST Registration",
    updated_at: null,
    ...overrides,
  };
}

function iso(year: number, month: number, day: number, hour = 10) {
  return new Date(year, month, day, hour).toISOString();
}

describe("statusBucket", () => {
  it("files every canonical status into a bucket", () => {
    expect(statusBucket("payment_pending")).toBe("awaiting_payment");
    expect(statusBucket("draft")).toBe("awaiting_payment");
    expect(statusBucket("documents_required")).toBe("action_needed");
    expect(statusBucket("objection")).toBe("action_needed");
    expect(statusBucket("in_progress")).toBe("in_progress");
    expect(statusBucket("delivered")).toBe("completed");
    expect(statusBucket("refunded")).toBe("closed");
  });

  it("groups an unknown status rather than dropping it", () => {
    expect(statusBucket("some_legacy_status")).toBe("in_progress");
    expect(statusBucket("")).toBe("in_progress");
  });

  it("ignores casing and surrounding space", () => {
    expect(statusBucket("  Documents_Required ")).toBe("action_needed");
  });
});

describe("buildTrend", () => {
  it("returns one point per day, oldest first, including empty days", () => {
    const trend = buildTrend([], { days: 14, now: NOW });

    expect(trend).toHaveLength(14);
    expect(trend.every((p) => p.applications === 0 && p.collection === 0)).toBe(true);
    expect(new Date(trend[0].date).getDate()).toBe(11);
    expect(new Date(trend[13].date).getDate()).toBe(24);
  });

  it("counts an application on its creation day", () => {
    const trend = buildTrend([app({ created_at: iso(2026, 8, 22) })], { days: 14, now: NOW });
    const day22 = trend.find((p) => new Date(p.date).getDate() === 22);

    expect(day22?.applications).toBe(1);
  });

  it("books collection on the settlement day, not the creation day", () => {
    const trend = buildTrend(
      [app({ created_at: iso(2026, 8, 20), updated_at: iso(2026, 8, 23), amount: 2500, payment_status: "paid" })],
      { days: 14, now: NOW },
    );

    expect(trend.find((p) => new Date(p.date).getDate() === 20)?.collection).toBe(0);
    expect(trend.find((p) => new Date(p.date).getDate() === 23)?.collection).toBe(2500);
  });

  it("leaves unpaid applications out of collection", () => {
    const trend = buildTrend(
      [app({ created_at: iso(2026, 8, 24), amount: 5000, payment_status: "pending" })],
      { days: 14, now: NOW },
    );

    expect(trend.at(-1)?.collection).toBe(0);
    expect(trend.at(-1)?.applications).toBe(1);
  });

  it("ignores anything older than the window", () => {
    const trend = buildTrend([app({ created_at: iso(2026, 7, 1) })], { days: 14, now: NOW });

    expect(trend.reduce((sum, p) => sum + p.applications, 0)).toBe(0);
  });
});

describe("buildServiceMix", () => {
  it("ranks services by application count", () => {
    const mix = buildServiceMix([
      app({ created_at: iso(2026, 8, 24), service_name: "ITR Filing" }),
      app({ created_at: iso(2026, 8, 24), service_name: "GST Registration" }),
      app({ created_at: iso(2026, 8, 24), service_name: "GST Registration" }),
    ]);

    expect(mix.map((m) => m.name)).toEqual(["GST Registration", "ITR Filing"]);
    expect(mix[0].applications).toBe(2);
  });

  it("only counts money that was actually paid", () => {
    const mix = buildServiceMix([
      app({ created_at: iso(2026, 8, 24), amount: 1000, payment_status: "paid" }),
      app({ created_at: iso(2026, 8, 24), amount: 9000, payment_status: "pending" }),
    ]);

    expect(mix[0].applications).toBe(2);
    expect(mix[0].amount).toBe(1000);
  });

  it("folds the tail into one Other row that keeps its totals", () => {
    const apps = ["A", "B", "C", "D", "E", "F", "G"].map((name) =>
      app({ created_at: iso(2026, 8, 24), service_name: name, amount: 100, payment_status: "paid" }),
    );

    const mix = buildServiceMix(apps, { limit: 5 });

    expect(mix).toHaveLength(6);
    expect(mix.at(-1)).toEqual({ name: "Other", applications: 2, amount: 200 });
  });

  it("does not add an Other row when everything fits", () => {
    const mix = buildServiceMix(
      [app({ created_at: iso(2026, 8, 24) }), app({ created_at: iso(2026, 8, 24), service_name: "ITR" })],
      { limit: 5 },
    );

    expect(mix.some((m) => m.name === "Other")).toBe(false);
  });

  it("names a blank service rather than dropping it", () => {
    const mix = buildServiceMix([app({ created_at: iso(2026, 8, 24), service_name: "  " })]);

    expect(mix[0].name).toBe("Other service");
  });
});

describe("buildStatusMix", () => {
  it("keeps a fixed bucket order and drops empty buckets", () => {
    const mix = buildStatusMix([
      app({ created_at: iso(2026, 8, 24), status: "completed" }),
      app({ created_at: iso(2026, 8, 24), status: "documents_required" }),
      app({ created_at: iso(2026, 8, 24), status: "completed" }),
    ]);

    expect(mix.map((m) => m.key)).toEqual(["action_needed", "completed"]);
    expect(mix.find((m) => m.key === "completed")?.count).toBe(2);
  });

  it("is empty for no applications", () => {
    expect(buildStatusMix([])).toEqual([]);
  });
});

describe("buildAnalytics", () => {
  it("totals only what the trend window covers", () => {
    const analytics = buildAnalytics(
      [
        app({ created_at: iso(2026, 8, 24), amount: 1000, payment_status: "paid" }),
        app({ created_at: iso(2026, 6, 1), amount: 9000, payment_status: "paid" }),
      ],
      { now: NOW },
    );

    expect(analytics.rangeApplications).toBe(1);
    expect(analytics.rangeCollection).toBe(1000);
    expect(analytics.isEmpty).toBe(false);
  });

  it("still reports the status mix across all applications, not just the window", () => {
    const analytics = buildAnalytics([app({ created_at: iso(2026, 6, 1), status: "completed" })], { now: NOW });

    expect(analytics.rangeApplications).toBe(0);
    expect(analytics.statusMix).toEqual([{ key: "completed", label: "Completed", count: 1 }]);
  });

  it("flags an empty dataset", () => {
    expect(buildAnalytics([], { now: NOW }).isEmpty).toBe(true);
  });
});

describe("sparkFrom", () => {
  it("takes the most recent points, oldest first", () => {
    const trend = buildTrend(
      [app({ created_at: iso(2026, 8, 24) }), app({ created_at: iso(2026, 8, 24) })],
      { days: 14, now: NOW },
    );

    const spark = sparkFrom(trend, "applications", 12);

    expect(spark).toHaveLength(12);
    expect(spark.at(-1)).toBe(2);
  });
});

describe("buildKpis", () => {
  const base = {
    trend: buildTrend([], { days: 14, now: NOW }),
    todayApplications: 4,
    yesterdayApplications: 2,
    todayCollection: 6000,
    yesterdayCollection: 4000,
    pendingApplications: 3,
    pendingPayments: 2,
    pendingCollection: 7500,
    commissionEarned: 12000,
    commissionPending: 3000,
  };

  it("returns exactly four headline numbers", () => {
    expect(buildKpis(base)).toHaveLength(4);
  });

  it("compares today against yesterday", () => {
    const kpis = buildKpis(base);

    expect(kpis[0].delta).toMatchObject({ label: "+50%", tone: "up", caption: "vs yesterday" });
    expect(kpis[1].delta).toMatchObject({ label: "+100%", tone: "up" });
  });

  it("shows pending commission as the commission caption, or nothing", () => {
    expect(buildKpis(base)[3].delta).toMatchObject({ caption: "still pending" });
    expect(buildKpis({ ...base, commissionPending: 0 })[3].delta).toBeNull();
  });

  it("marks open work pending only when there is some", () => {
    expect(buildKpis(base)[2].tone).toBe("pending");
    expect(buildKpis({ ...base, pendingApplications: 0 })[2].tone).toBe("default");
  });

  it("gives every KPI a distinct key and a destination", () => {
    const kpis = buildKpis(base);

    expect(new Set(kpis.map((k) => k.key)).size).toBe(kpis.length);
    expect(kpis.every((k) => k.href.startsWith("/ap/"))).toBe(true);
  });
});

describe("buildAttention", () => {
  it("is empty when nothing needs the partner", () => {
    expect(buildAttention([app({ created_at: iso(2026, 8, 24), status: "completed" })], { now: NOW })).toEqual([]);
  });

  it("leads with blocked documents", () => {
    const items = buildAttention(
      [
        app({ created_at: iso(2026, 8, 24), status: "documents_required" }),
        app({ created_at: iso(2026, 8, 24), status: "submitted", payment_status: "pending" }),
      ],
      { now: NOW },
    );

    expect(items[0].id).toBe("attention-documents");
    expect(items[0].severity).toBe("critical");
  });

  it("totals the money still owed", () => {
    const items = buildAttention(
      [
        app({ created_at: iso(2026, 8, 24), status: "submitted", payment_status: "pending", amount: 1500 }),
        app({ created_at: iso(2026, 8, 24), status: "submitted", payment_status: "failed", amount: 2500 }),
      ],
      { now: NOW },
    );

    expect(items[0].title).toContain("₹4,000");
  });

  it("does not chase payment on a closed application", () => {
    const items = buildAttention(
      [app({ created_at: iso(2026, 8, 24), status: "cancelled", payment_status: "pending", amount: 5000 })],
      { now: NOW },
    );

    expect(items.some((i) => i.id === "attention-payments")).toBe(false);
  });

  it("flags work untouched for a week, but not fresh work", () => {
    const stale = buildAttention(
      [app({ created_at: iso(2026, 8, 1), updated_at: iso(2026, 8, 1), status: "in_progress" })],
      { now: NOW },
    );
    const fresh = buildAttention(
      [app({ created_at: iso(2026, 8, 23), updated_at: iso(2026, 8, 23), status: "in_progress" })],
      { now: NOW },
    );

    expect(stale.some((i) => i.id === "attention-stale")).toBe(true);
    expect(fresh.some((i) => i.id === "attention-stale")).toBe(false);
  });

  it("never grows past three rows", () => {
    const apps = [
      app({ created_at: iso(2026, 8, 24), status: "documents_required" }),
      app({ created_at: iso(2026, 8, 24), status: "submitted", payment_status: "pending" }),
      app({ created_at: iso(2026, 8, 1), updated_at: iso(2026, 8, 1), status: "in_progress" }),
    ];

    expect(buildAttention(apps, { now: NOW })).toHaveLength(3);
  });
});

describe("describeStatusMix", () => {
  it("reads the split out for a screen reader", () => {
    const mix = buildStatusMix([
      app({ created_at: iso(2026, 8, 24), status: "completed" }),
      app({ created_at: iso(2026, 8, 24), status: "documents_required" }),
    ]);

    expect(describeStatusMix(mix)).toBe("2 applications: Action needed 1, Completed 1.");
  });

  it("handles the empty case", () => {
    expect(describeStatusMix([])).toBe("No applications yet.");
  });
});
