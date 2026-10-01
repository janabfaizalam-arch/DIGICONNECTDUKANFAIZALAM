import { describe, expect, it } from "vitest";

import {
  buildPartnerRollups,
  rollupFor,
  EMPTY_PARTNER_ROLLUP,
  type PartnerApplicationRow,
  type PartnerCommissionRow,
} from "./partner-rollups";

/*
  These lock the counting rules that used to live inline in
  `getAdminAgencyPartnerList` as per-partner `.filter()` chains. The move from
  quadratic filtering to a single indexed pass must not change a single number,
  so every rule the original expressed is asserted here.

  One deliberate difference: status matching is now case-insensitive. Every
  value in APPLICATION_STATUS_OPTIONS is lowercase, so this is a no-op for any
  row the application itself wrote; it only rescues a legacy or imported row
  like "Completed", which the original counted as neither completed nor
  closed.
*/

const app = (
  agency_partner_id: string | null,
  status: string | null,
  id = Math.random().toString(36).slice(2),
): PartnerApplicationRow => ({ id, agency_partner_id, status });

const commission = (
  agency_partner_id: string | null,
  status: string | null,
  calculated_amount: number | null,
): PartnerCommissionRow => ({ agency_partner_id, status, calculated_amount });

describe("buildPartnerRollups — application counting", () => {
  it("counts every application against its own partner", () => {
    const rollups = buildPartnerRollups(
      [app("p1", "submitted"), app("p1", "completed"), app("p2", "submitted")],
      [],
    );

    expect(rollupFor(rollups, "p1").totalApplications).toBe(2);
    expect(rollupFor(rollups, "p2").totalApplications).toBe(1);
  });

  it("treats completed, rejected and cancelled as not pending", () => {
    const rollups = buildPartnerRollups(
      [
        app("p1", "completed"),
        app("p1", "rejected"),
        app("p1", "cancelled"),
        app("p1", "submitted"),
        app("p1", "in_progress"),
      ],
      [],
    );

    const rollup = rollupFor(rollups, "p1");
    expect(rollup.totalApplications).toBe(5);
    expect(rollup.pendingApplications).toBe(2);
    expect(rollup.completedApplications).toBe(1);
  });

  it("matches status case-insensitively", () => {
    // A status written "Completed" used to be counted as pending AND not
    // completed — wrong on both axes. Only reachable via legacy/imported rows.
    const rollups = buildPartnerRollups([app("p1", "Completed"), app("p1", "CANCELLED")], []);

    const rollup = rollupFor(rollups, "p1");
    expect(rollup.completedApplications).toBe(1);
    expect(rollup.pendingApplications).toBe(0);
  });

  it("counts a null status as pending work, not completed", () => {
    const rollups = buildPartnerRollups([app("p1", null)], []);

    expect(rollupFor(rollups, "p1").pendingApplications).toBe(1);
    expect(rollupFor(rollups, "p1").completedApplications).toBe(0);
  });
});

describe("buildPartnerRollups — commission totals", () => {
  it("sums pending, earned and approved into pending commission", () => {
    const rollups = buildPartnerRollups(
      [],
      [
        commission("p1", "pending", 100),
        commission("p1", "earned", 50.5),
        commission("p1", "approved", 25),
        commission("p1", "paid", 1000),
      ],
    );

    const rollup = rollupFor(rollups, "p1");
    expect(rollup.pendingCommission).toBe(175.5);
    expect(rollup.totalPaidCommission).toBe(1000);
  });

  it("excludes cancelled and reversed commission from both totals", () => {
    const rollups = buildPartnerRollups(
      [],
      [commission("p1", "cancelled", 500), commission("p1", "reversed", 300)],
    );

    const rollup = rollupFor(rollups, "p1");
    expect(rollup.pendingCommission).toBe(0);
    expect(rollup.totalPaidCommission).toBe(0);
  });

  it("treats an unparseable amount as zero rather than NaN", () => {
    // A single NaN would poison the whole column in the UI.
    const rollups = buildPartnerRollups(
      [],
      [
        commission("p1", "paid", null),
        commission("p1", "paid", "abc" as unknown as number),
        commission("p1", "paid", 200),
      ],
    );

    expect(rollupFor(rollups, "p1").totalPaidCommission).toBe(200);
  });
});

describe("buildPartnerRollups — partner keys", () => {
  it("ignores rows with no partner instead of bucketing them together", () => {
    const rollups = buildPartnerRollups(
      [app(null, "submitted"), app("", "submitted"), app("   ", "submitted")],
      [commission(null, "paid", 999)],
    );

    expect(rollups.size).toBe(0);
  });

  it("returns zeroes for a partner with nothing against them", () => {
    const rollups = buildPartnerRollups([app("p1", "submitted")], []);

    expect(rollupFor(rollups, "unknown-partner")).toEqual(EMPTY_PARTNER_ROLLUP);
  });

  it("does not let the shared empty rollup be mutated by a caller", () => {
    const rollups = buildPartnerRollups([], []);
    const first = rollupFor(rollups, "missing");
    expect(first.totalApplications).toBe(0);
    expect(EMPTY_PARTNER_ROLLUP.totalApplications).toBe(0);
  });
});

describe("buildPartnerRollups — scale", () => {
  it("indexes in one pass rather than scanning per partner", () => {
    // 500 partners x 20,000 applications is the shape that made the previous
    // implementation ~10M array operations. This must stay linear.
    const applications: PartnerApplicationRow[] = [];
    for (let index = 0; index < 20_000; index += 1) {
      applications.push(app(`p${index % 500}`, index % 3 === 0 ? "completed" : "submitted"));
    }

    const started = Date.now();
    const rollups = buildPartnerRollups(applications, []);
    const elapsed = Date.now() - started;

    expect(rollups.size).toBe(500);
    expect(rollupFor(rollups, "p0").totalApplications).toBe(40);
    // Generous: the point is that it is not quadratic, not a benchmark.
    expect(elapsed).toBeLessThan(1000);
  });

  it("totals across all partners match the input row count", () => {
    const applications = [
      app("p1", "completed"),
      app("p1", "submitted"),
      app("p2", "rejected"),
      app("p3", "in_progress"),
    ];

    const rollups = buildPartnerRollups(applications, []);
    const counted = [...rollups.values()].reduce((sum, r) => sum + r.totalApplications, 0);

    expect(counted).toBe(applications.length);
  });
});
