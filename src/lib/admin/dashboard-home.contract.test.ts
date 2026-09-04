import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const view = readCode("src/components/admin/admin-dashboard-view.tsx");
const chart = readCode("src/components/admin/admin-trend-chart.tsx");
const data = readCode("src/lib/admin/dashboard-data.ts");

/* ─────────────────────────────────────────────────────────────────────────
   Work the page paid for and threw away
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The server computed period-over-period deltas for fifteen metrics, six chart
 * series, messaging health and seven widget lists — and the page rendered
 * three numbers and two lists. Everything else was database work done on every
 * load for nobody. Either it is shown or it should stop being computed.
 */
describe("nothing is computed for nobody", () => {
  it("shows the deltas the server was already working out", () => {
    // The page could say there were nine applications but not whether nine
    // was a good morning.
    expect(view).toContain("const { delta } = metric;");
    expect(view).toContain("delta.percent");
    expect(view).toContain("delta.label");
    // And it knows which direction is the good one: more failed payments is
    // not a green arrow.
    expect(view).toContain("delta.absolute > 0 === metric.increaseIsGood");
  });

  it("shows the trend series", () => {
    expect(view).toContain("payload.charts.applicationsTrend");
    expect(view).toContain("payload.charts.revenueTrend");
  });

  it("shows messaging and automation health", () => {
    expect(view).toContain("health.openOpsAlerts");
    expect(view).toContain("health.queuedMessages");
    expect(view).toContain("health.configRequiredMessages");
    expect(view).toContain("health.automationPending");
  });

  it("shows partner approvals waiting, which had no screen at all", () => {
    expect(view).toContain("payload.workload.pendingPartnerApprovals");
  });

  it("says so when the alert source could not be read", () => {
    // It was computed and silently dropped, so a partial picture looked whole.
    expect(view).toContain("payload.alertsSourceError");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Ranking, not dumping
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The screen this replaced opened with about thirty numbers, most of them zero
 * on a normal morning. A screen that shows everything ranks nothing.
 */
describe("what earns a row", () => {
  it("drops every queue row that is empty", () => {
    expect(view).toContain(".filter((row) => row.count > 0)");
  });

  it("drops every health row that is empty too", () => {
    const health = view.slice(view.indexOf("function SystemHealth"));
    expect(health).toContain("filter((row) => row.count > 0)");
  });

  it("says one calm line instead of four zeroes when nothing is wrong", () => {
    expect(view).toContain("Messaging and automation are running clean");
    expect(view).toContain("The queue is clear.");
  });

  it("features five metrics, not fifteen", () => {
    const featured = view.slice(view.indexOf("const FEATURED_METRICS"), view.indexOf("] as const"));
    expect(featured.match(/"/g)!.length / 2).toBe(5);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The chart
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Applications and revenue share a date and nothing else. Two scales on one
 * pair of axes is the fastest way to build a chart that says whatever the
 * reader already believed.
 */
describe("one measure, one axis", () => {
  it("never puts both series on screen together", () => {
    expect(chart).toContain("series.find((item) => item.id === activeId)");
    expect(chart).not.toContain("yAxisId");
  });

  it("names the measure in the caption, so no legend is needed", () => {
    expect(chart).toContain("{active.label} across the period");
  });

  it("ships hover, because a chart with no hover is a picture", () => {
    expect(chart).toContain("onPointerMove={track}");
    expect(chart).toContain("nearestPoint(geometry.points, x)");
  });

  it("maps the pointer back into the drawing's own coordinates", () => {
    // The SVG scales to its container; reading clientX raw puts the crosshair
    // in the wrong column on every screen but one.
    expect(chart).toContain("box.width) * WIDTH");
  });

  it("stays readable without sight of it", () => {
    expect(chart).toContain('role="img"');
    expect(chart).toContain("aria-label=");
  });

  it("draws with no charting library on the busiest admin screen", () => {
    expect(chart).not.toContain("recharts");
  });

  it("respects a reader who asked for less movement", () => {
    expect(chart).toContain("useReducedMotion");
    expect(view).toContain("useReducedMotion");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Speed
   ───────────────────────────────────────────────────────────────────────── */

describe("what the page waits for", () => {
  it("asks for both trend series at once", () => {
    /*
      These were two awaits one after the other, after a Promise.all that
      already batches thirty other reads — two full round trips in series for
      two queries with nothing to say to each other.
    */
    const region = data.slice(data.indexOf("let applicationsTrend"), data.indexOf("if (!appSeriesError"));
    expect(region).toContain("await Promise.all([");
    expect(region).toContain("admin_dashboard_application_series");
    expect(region).toContain("admin_dashboard_revenue_series");
    expect(region.match(/await /g)).toHaveLength(1);
  });
});
