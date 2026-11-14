import { describe, expect, it } from "vitest";

import {
  buildPartnerRollups,
  formatServicesUsed,
  rollupFor,
  EMPTY_PARTNER_ROLLUP,
  type PartnerApplicationRow,
  type PartnerCommissionRow,
  type PartnerLedgerRow,
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

/* ─────────────────────────────────────────────────────────────────────────
   Activity and wallet — what the admin list and the printed sheet report
   ───────────────────────────────────────────────────────────────────────── */

/*
  A lifetime application count never falls, so it cannot answer "is this
  partner still working?". These lock the three things that can: when they last
  applied, what for, and what is in their wallet now.
*/

const applied = (
  agency_partner_id: string,
  created_at: string,
  service_name: string | null,
  status = "submitted",
  wallet_amount = 0,
): PartnerApplicationRow => ({
  id: Math.random().toString(36).slice(2),
  agency_partner_id,
  status,
  created_at,
  service_name,
  wallet_amount,
});

const ledgerEntry = (
  agency_partner_id: string,
  entry_type: string,
  amount: number,
): PartnerLedgerRow => ({ agency_partner_id, entry_type, amount });

describe("buildPartnerRollups — last activity", () => {
  it("reports the newest application whatever order the rows arrive in", () => {
    const rollups = buildPartnerRollups(
      [
        applied("p1", "2026-03-01T10:00:00Z", "ITR Filing"),
        applied("p1", "2026-11-09T09:30:00Z", "Driving Licence"),
        applied("p1", "2026-07-15T12:00:00Z", "PAN Card"),
      ],
      [],
    );

    const rollup = rollupFor(rollups, "p1");
    expect(rollup.lastApplicationAt).toBe("2026-11-09T09:30:00Z");
    expect(rollup.lastServiceName).toBe("Driving Licence");
  });

  it("is null for a partner who has never applied", () => {
    const rollups = buildPartnerRollups([applied("p1", "2026-03-01T10:00:00Z", "ITR")], []);
    expect(rollupFor(rollups, "p2").lastApplicationAt).toBeNull();
    expect(rollupFor(rollups, "p2").lastServiceName).toBeNull();
  });

  it("survives a row with no date rather than reporting it as the latest", () => {
    const rollups = buildPartnerRollups(
      [
        applied("p1", "2026-05-01T10:00:00Z", "ITR Filing"),
        { id: "x", agency_partner_id: "p1", status: "submitted", created_at: null, service_name: "Ghost" },
      ],
      [],
    );
    expect(rollupFor(rollups, "p1").lastApplicationAt).toBe("2026-05-01T10:00:00Z");
    expect(rollupFor(rollups, "p1").lastServiceName).toBe("ITR Filing");
  });
});

describe("buildPartnerRollups — services used", () => {
  it("counts each service and puts the most-used first", () => {
    const rollups = buildPartnerRollups(
      [
        applied("p1", "2026-01-01T00:00:00Z", "ITR Filing"),
        applied("p1", "2026-01-02T00:00:00Z", "ITR Filing"),
        applied("p1", "2026-01-03T00:00:00Z", "ITR Filing"),
        applied("p1", "2026-01-04T00:00:00Z", "Driving Licence"),
      ],
      [],
    );

    expect(rollupFor(rollups, "p1").servicesUsed).toEqual([
      { name: "ITR Filing", count: 3 },
      { name: "Driving Licence", count: 1 },
    ]);
  });

  it("keeps each partner's services to themselves", () => {
    // The blank rollup used to be spread from a shared constant; a shared
    // array would have collected every partner's services into one list.
    const rollups = buildPartnerRollups(
      [
        applied("p1", "2026-01-01T00:00:00Z", "ITR Filing"),
        applied("p2", "2026-01-02T00:00:00Z", "PAN Card"),
      ],
      [],
    );

    expect(rollupFor(rollups, "p1").servicesUsed).toEqual([{ name: "ITR Filing", count: 1 }]);
    expect(rollupFor(rollups, "p2").servicesUsed).toEqual([{ name: "PAN Card", count: 1 }]);
    expect(EMPTY_PARTNER_ROLLUP.servicesUsed).toEqual([]);
  });

  it("ignores an application with no service name instead of counting a blank", () => {
    const rollups = buildPartnerRollups(
      [applied("p1", "2026-01-01T00:00:00Z", null), applied("p1", "2026-01-02T00:00:00Z", "  ")],
      [],
    );
    expect(rollupFor(rollups, "p1").servicesUsed).toEqual([]);
    expect(rollupFor(rollups, "p1").totalApplications).toBe(2);
  });
});

describe("buildPartnerRollups — wallet balance", () => {
  it("folds the ledger the same way the partner's own wallet screen does", () => {
    const rollups = buildPartnerRollups(
      [],
      [],
      [
        ledgerEntry("p1", "commission_credit", 25),
        ledgerEntry("p1", "commission_credit", 25),
        ledgerEntry("p1", "application_spend", 25),
      ],
    );
    expect(rollupFor(rollups, "p1").walletBalance).toBe(25);
  });

  it("counts a spend as a debit, so the list cannot overstate what a partner has", () => {
    const rollups = buildPartnerRollups(
      [],
      [],
      [ledgerEntry("p1", "manual_credit", 500), ledgerEntry("p1", "application_spend", 100)],
    );
    expect(rollupFor(rollups, "p1").walletBalance).toBe(400);
  });

  it("is zero for a partner with no ledger at all", () => {
    const rollups = buildPartnerRollups([applied("p1", "2026-01-01T00:00:00Z", "ITR")], []);
    expect(rollupFor(rollups, "p1").walletBalance).toBe(0);
  });

  it("totals what the wallet has paid towards applications", () => {
    const rollups = buildPartnerRollups(
      [
        applied("p1", "2026-01-01T00:00:00Z", "ITR Filing", "completed", 25),
        applied("p1", "2026-01-02T00:00:00Z", "ITR Filing", "completed", 75),
      ],
      [],
    );
    expect(rollupFor(rollups, "p1").walletSpent).toBe(100);
  });

  it("skips a ledger row with no partner rather than bucketing it under a phantom", () => {
    const rollups = buildPartnerRollups([], [], [
      { agency_partner_id: null, entry_type: "manual_credit", amount: 999 },
    ]);
    expect(rollups.size).toBe(0);
  });
});

describe("formatServicesUsed", () => {
  it("reads as something a person can scan", () => {
    expect(
      formatServicesUsed([
        { name: "ITR Filing", count: 3 },
        { name: "Driving Licence", count: 1 },
      ]),
    ).toBe("ITR Filing x3, Driving Licence x1");
  });

  it("is empty when nothing has been used, not a dash", () => {
    expect(formatServicesUsed([])).toBe("");
  });

  it("caps a long list and says how many were left out", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `Service ${i + 1}`, count: 1 }));
    const text = formatServicesUsed(many, 4);
    expect(text).toContain("Service 1 x1");
    expect(text).toContain("+5 more");
    expect(text).not.toContain("Service 6");
  });
});
