import { describe, expect, it } from "vitest";

import { emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import { applyTemplate } from "./templates";

/**
 * The bank format the admin works from: project cost 10.00 = machinery 6.00
 * + working capital 4.00; MYSY margin 10% on both parts, so term loan 5.40,
 * CC 3.60 and the promoter's capital 1.00.
 */
function bakery(workingCapital: number | null, cost = 1000000, own = 10): DprInput {
  const base: DprInput = {
    ...emptyDpr(new Date("2026-11-08")),
    businessName: "Mohd Asif Khan",
    district: "Jalaun",
    scheme: "mysy",
    ownContributionPct: own,
    workingCapitalOverride: workingCapital,
  };
  return applyTemplate(base, "bakery", cost, (i) => buildDpr(i).cost.total);
}

describe("margin money on both term loan and CC", () => {
  it("matches the reference DPR: 6 + 4 lakh, 10% margin -> TL 5.40, CC 3.60, own 1.00", () => {
    const report = buildDpr(bakery(400000));
    expect(report.cost.total).toBe(1000000);
    expect(report.cost.workingCapital).toBe(400000);
    expect(report.means.termLoan).toBe(540000);
    expect(report.means.ccLimit).toBe(360000);
    expect(report.means.ownContribution).toBe(100000);
    expect(report.errors).toEqual([]);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);
  });

  it("splits the margin over both parts when working capital is left to the engine", () => {
    const report = buildDpr(bakery(null, 500000, 12.5));
    const wc = report.cost.workingCapital;
    expect(report.cost.total).toBe(500000);
    expect(report.means.ccLimit).toBeCloseTo(wc * 0.875, -1);
    expect(report.means.termLoan).toBeCloseTo((500000 - wc) * 0.875, -1);
    expect(report.means.ownContribution).toBe(62500);
  });

  it("takes loans typed as sanctioned: TL 2,62,500 + CC 1,75,000 at 12.5% -> project 5 lakh, own 62,500", () => {
    const built = bakery(200000, 500000, 12.5);
    const report = buildDpr({ ...built, termLoanOverride: 262500, ccLimitOverride: 175000 });
    expect(report.cost.total).toBe(500000);
    expect(report.cost.workingCapital).toBe(200000);
    expect(report.means.termLoan).toBe(262500);
    expect(report.means.ccLimit).toBe(175000);
    expect(report.means.ownContribution).toBe(62500);
    expect(report.errors).toEqual([]);
  });
});
