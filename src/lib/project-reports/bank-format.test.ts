import { describe, expect, it } from "vitest";

import { emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import { applyTemplate, asBankFormat } from "./templates";

/**
 * The admin's reference DPR (water plant, MYSY): project 25.00 lakh =
 * machinery 21.24 + working capital 3.76, margin 5%, term loan 20.178 at
 * 11.25% repaid in five yearly instalments of 4.04 (the last 4.02),
 * subsidy 6.25 held all five years, DSCR on term loan + CC interest,
 * averaged year by year.
 */
function waterPlant(): DprInput {
  const base: DprInput = {
    ...emptyDpr(new Date("2026-11-08")),
    businessName: "Shlok Patel",
    district: "Jalaun",
    scheme: "mysy",
    ownContributionPct: 5,
    workingCapitalOverride: 376000,
    termLoanInterestPct: 11.25,
    ccInterestPct: 11.25,
    tenureYears: 5,
    bankFormat: true,
    moratoriumMonths: 0,
    repaymentFrequency: "yearly",
    repaymentMethod: "equal_principal",
  };
  return asBankFormat(applyTemplate(base, "packaged-water", 2500000, (i) => buildDpr(i).cost.total));
}

const lakh = (v: number) => Math.round(v / 1000) / 100;

describe("bank DPR format", () => {
  const report = buildDpr(waterPlant());

  it("splits 25 lakh into TL 20.178, CC 3.572 and own 1.25", () => {
    expect(report.cost.total).toBe(2500000);
    expect(report.means.termLoan).toBe(2017800);
    expect(report.means.ccLimit).toBe(357200);
    expect(report.means.ownContribution).toBe(125000);
  });

  it("repays in yearly instalments of 4.04 lakh with interest on the opening balance", () => {
    const r = report.repayment.slice(0, 5);
    expect(r.map((y) => lakh(y.opening))).toEqual([20.18, 16.14, 12.1, 8.06, 4.02]);
    expect(r.map((y) => lakh(y.interest))).toEqual([2.27, 1.82, 1.36, 0.91, 0.45]);
    expect(r.map((y) => lakh(y.principal))).toEqual([4.04, 4.04, 4.04, 4.04, 4.02]);
    expect(r[4].closing).toBe(0);
    expect(r.every((y) => y.subsidyAdjusted === 0)).toBe(true);
  });

  it("keeps the subsidy as reserve and deposit for all five years", () => {
    expect(report.means.subsidy).toBe(625000);
    for (const y of report.years) {
      expect(y.subsidyReserve).toBe(625000);
      expect(y.subsidyDeposit).toBe(625000);
    }
  });

  it("counts term loan and CC interest in the DSCR and averages the yearly ratios", () => {
    for (const y of report.years) {
      const interest = y.termLoanInterest + y.ccInterest - y.interestSubvention;
      expect(y.dscr).toBeCloseTo((y.cashAccrual + interest) / (interest + y.principalRepaid), 2);
      expect(y.tax).toBe(0);
      expect(y.currentMaturities).toBeGreaterThanOrEqual(0);
    }
    const mean = report.years.reduce((s, y) => s + (y.dscr ?? 0), 0) / report.years.length;
    expect(report.averageDscr).toBeCloseTo(mean, 2);
  });

  it("shows machinery 21.24 and working capital 3.76, depreciated at 15% WDV", () => {
    expect(report.cost.lines.map((l) => [l.kind, l.amount])).toEqual([["machinery", 2124000]]);
    expect(report.cost.workingCapital).toBe(376000);
    expect(report.years.map((y) => lakh(y.depreciation))).toEqual([3.19, 2.71, 2.3, 1.96, 1.66]);
  });

  it("still reconciles every statement", () => {
    expect(report.errors).toEqual([]);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);
  });
});
