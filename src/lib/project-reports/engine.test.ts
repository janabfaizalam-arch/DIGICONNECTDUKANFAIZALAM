import { describe, expect, it } from "vitest";

import { draftNarrative, narrativeFor } from "./defaults";
import { sampleDpr } from "./sample";
import { buildDpr, loanSchedule, projectCostOf, workingCapitalOf, type DprInput } from "./engine";

/** The worked example, with the original test overheads. */
function sample(overrides: Partial<DprInput> = {}): DprInput {
  return {
    ...sampleDpr(new Date("2026-11-08")),
    premises: "rented",
    debtorDays: 30,
    creditorDays: 15,
    overheads: [
      { name: "Power", monthly: 25000, variable: true, direct: true },
      { name: "Rent", monthly: 5000, variable: false, direct: false },
      { name: "Office", monthly: 2000, variable: false, direct: false },
    ],
    ...overrides,
  };
}

describe("project cost and means of finance", () => {
  it("adds up capital items and leaves land out under PMEGP", () => {
    const input = sample();
    const cost = projectCostOf(input);
    expect(cost.fixedCapital).toBe(630000);
    expect(cost.preliminary).toBe(20000);
    expect(cost.land).toBe(300000);
    expect(cost.landOutside).toBe(300000);
    expect(cost.total).toBe(round(630000 + 20000 + workingCapitalOf(input).requirement));
  });

  it("includes land when asked", () => {
    const cost = projectCostOf(sample({ includeLand: true, scheme: "none" }));
    expect(cost.fixedCapital).toBe(930000);
    expect(cost.landOutside).toBe(0);
  });

  it("works out working capital from the holding periods", () => {
    const wc = workingCapitalOf(sample());
    const y1 = buildDpr(sample()).years[0];
    // Year 1 at 60%: sales 54 lakh; wheat consumption follows production.
    expect(wc.debtors).toBeCloseTo((5400000 * 30) / 365, 1);
    expect(wc.creditors).toBeCloseTo((y1.rawMaterial * 15) / 365, 1);
    expect(wc.requirement).toBeCloseTo(wc.rawMaterialStock + wc.workInProgress + wc.finishedGoods + wc.debtors + wc.minimumCash - wc.creditors, 1);
    expect(wc.minimumCash).toBeGreaterThan(0);
  });

  it("takes the PMEGP special-category rural terms: 5% own, 35% subsidy", () => {
    const report = buildDpr(sample());
    expect(report.means.ownContributionPct).toBe(5);
    expect(report.means.ownContribution).toBeCloseTo(report.cost.total * 0.05, 1);
    expect(report.means.subsidy).toBeCloseTo(report.cost.total * 0.35, 1);
    expect(report.means.total).toBeCloseTo(report.cost.total, 0);
    expect(Math.abs(report.means.gap)).toBeLessThanOrEqual(1);
    // Bank loan split: CC carries the working capital share.
    expect(report.means.ccLimit / report.means.bankLoan).toBeCloseTo(report.cost.workingCapital / report.cost.total, 4);
  });

  it("flags a gap when typed loans do not cover the cost", () => {
    const report = buildDpr(sample({ termLoanOverride: 100000, ccLimitOverride: 0 }));
    expect(report.means.gap).toBeLessThan(0);
    expect(report.warnings.some((w) => w.includes("Means of finance"))).toBe(true);
  });
});

describe("repayment schedule", () => {
  it("charges interest only in the moratorium and repays the loan exactly", () => {
    const input = sample({ tenureYears: 5, moratoriumMonths: 6, termLoanInterestPct: 12 });
    const rows = loanSchedule(input, 600000);
    const repaid = rows.reduce((sum, r) => sum + r.principal, 0);
    expect(repaid).toBeCloseTo(600000, 2);
    expect(rows.at(-1)!.closing).toBe(0);
    expect(rows).toHaveLength(60);
    // Interest only for 6 months, then 54 instalments of 11,111.11.
    expect(rows.slice(0, 6).every((r) => r.principal === 0)).toBe(true);
    expect(rows[0].interest).toBe(6000);
    expect(rows[6].principal).toBeCloseTo(600000 / 54, 1);
    const yearOne = rows.slice(0, 12).reduce((s, r) => s + r.principal, 0);
    expect(yearOne).toBeCloseTo((600000 / 54) * 6, 0);
  });

  it("never repays more than borrowed with zero moratorium", () => {
    const rows = loanSchedule(sample({ moratoriumMonths: 0, tenureYears: 3 }), 360000);
    expect(rows.slice(0, 12).reduce((s, r) => s + r.principal, 0)).toBeCloseTo(120000, 0);
    expect(rows.reduce((s, r) => s + r.principal, 0)).toBeCloseTo(360000, 1);
  });
});

describe("projections", () => {
  const report = buildDpr(sample());

  it("projects five years with rising utilisation", () => {
    expect(report.years).toHaveLength(5);
    expect(report.years.map((y) => y.utilisationPct)).toEqual([60, 70, 80, 85, 90]);
    expect(report.years[0].sales).toBe(5400000);
    expect(report.years[1].sales).toBe(6300000);
  });

  it("balances every projected balance sheet", () => {
    for (const y of report.years) expect(Math.abs(y.totalAssets - y.totalLiabilities)).toBeLessThan(1);
    expect(report.checks.balanceSheetBalances).toBe(true);
  });

  it("cash flow closes at the balance sheet's cash every year", () => {
    for (const [i, cf] of report.cashFlow.entries()) {
      expect(cf.closingCash).toBeCloseTo(report.years[i].cash, 0);
      if (i > 0) expect(cf.openingCash).toBeCloseTo(report.cashFlow[i - 1].closingCash, 1);
    }
  });

  it("depreciates WDV by asset class and writes off preliminary over 5 years", () => {
    const machinery = report.depreciation.find((d) => d.kind === "machinery")!;
    expect(machinery.ratePct).toBe(15);
    expect(machinery.perYear[0]).toBe(82500);
    expect(machinery.perYear[1]).toBe(70125);
    expect(report.years.every((y) => y.preliminaryWrittenOff === 4000)).toBe(true);
  });

  it("computes DSCR as (PAT + depreciation + write-off + interest) / (interest + principal), averaged the bank way", () => {
    for (const y of report.years) {
      if (y.dscr === null) continue;
      const expected = (y.cashAccrual + y.termLoanInterest) / (y.termLoanInterest + y.principalRepaid);
      expect(y.dscr).toBeCloseTo(expected, 1);
    }
    const serviced = report.years.filter((y) => y.dscr !== null);
    const num = serviced.reduce((s, y) => s + y.cashAccrual + y.termLoanInterest, 0);
    const den = serviced.reduce((s, y) => s + y.termLoanInterest + y.principalRepaid, 0);
    expect(report.averageDscr).toBeCloseTo(num / den, 2);
  });

  it("finds a break-even below the operating utilisation for a viable unit", () => {
    expect(report.breakEven).not.toBeNull();
    expect(report.breakEven!.label).toBe(report.years[2].label);
    expect(report.breakEven!.bepCapacityPct).toBeGreaterThan(0);
    expect(report.breakEven!.bepCapacityPct!).toBeLessThan(report.years[2].utilisationPct);
    expect(report.breakEven!.cashBepCapacityPct!).toBeLessThan(report.breakEven!.bepCapacityPct!);
  });

  it("applies CM-YUVA's full interest subvention for 4 years", () => {
    const yuva = buildDpr(sample({ scheme: "cmyuva", capitalItems: [{ kind: "machinery", description: "Machine", quantity: 1, rate: 300000 }], products: [{ name: "Item", unit: "pc", capacity: 1000, price: 1500 }], rawMaterials: [{ name: "RM", unit: "pc", quantity: 1000, rate: 900 }] }));
    expect(yuva.years[0].interestSubvention).toBeCloseTo(yuva.years[0].termLoanInterest + yuva.years[0].ccInterest, 1);
    expect(yuva.years[4].interestSubvention).toBe(0);
  });

  it("warns when the scheme's project cost limit is crossed", () => {
    const big = buildDpr(sample({ scheme: "cmyuva" }));
    expect(big.warnings.some((w) => w.includes("CM-YUVA mein project cost"))).toBe(true);
  });

  it("warns about land under PMEGP", () => {
    expect(buildDpr(sample({ includeLand: true })).warnings.some((w) => w.includes("zameen"))).toBe(true);
  });
});

describe("the worked example", () => {
  it("is a clean, viable DPR an admin can learn from", () => {
    const report = buildDpr(sampleDpr(new Date("2026-11-08")));
    expect(report.errors).toEqual([]);
    // Only the supplier quotations are left for the customer to furnish.
    expect(report.warnings.filter((w) => !/quotation/i.test(w))).toEqual([]);
    expect(report.averageDscr!).toBeGreaterThan(1.5);
    expect(report.years.every((y) => y.cash >= 0 && y.netProfit > 0)).toBe(true);
  });
});

describe("narrative", () => {
  it("drafts every section from the figures", () => {
    const input = sample();
    const text = draftNarrative(input);
    expect(text.introduction).toContain("Shree Ram Flour Mill");
    expect(text.introduction).toContain("PMEGP");
    expect(text.promoters).toContain("Ramesh Kumar");
    expect(text.conclusion).toMatch(/DSCR of \d/);
  });

  it("keeps the admin's own text over the draft", () => {
    const input = sample({ narrative: { market: "Our own market note." } });
    const text = narrativeFor(input, buildDpr(input));
    expect(text.market).toBe("Our own market note.");
    expect(text.introduction).toContain("Shree Ram");
  });
});

function round(v: number) {
  return Math.round(v * 100) / 100;
}
