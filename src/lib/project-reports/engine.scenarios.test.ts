import { describe, expect, it } from "vitest";

import { emptyDpr } from "./defaults";
import { buildDpr, incomeTax, loanSchedule, type DprInput, type DprReport } from "./engine";
import { withEstimatedCosts } from "./estimates";
import { LEAF_BEVERAGES_SAVED } from "./fixtures/leaf-beverages";
import { sampleDpr } from "./sample";
import { finalBlockerFor } from "./validation";
import { applyTemplate } from "./templates";

/**
 * Scenario tests: every kind of project the generator is asked for, each
 * held to the same rule — every statement reconciles with every other, and
 * no figure is NaN, Infinity or undefined.
 */

const NOW = new Date("2026-11-08");
const base = (overrides: Partial<DprInput> = {}): DprInput => ({ ...sampleDpr(NOW), ...overrides });
const promoter = { ...emptyDpr(NOW).promoters[0], name: "Test Promoter", age: 30, qualification: "Graduate", experience: "5 years in the trade" };
const fromTemplate = (id: string, lakh: number, overrides: Partial<DprInput> = {}) =>
  applyTemplate({ ...emptyDpr(NOW), businessName: "Test Unit", district: "Jalaun", address: "Orai", promoters: [promoter], scheme: "none", ...overrides }, id, lakh * 100000);

function deepFinite(value: unknown, path = "report"): string[] {
  if (typeof value === "number") return Number.isFinite(value) ? [] : [path];
  if (value === undefined) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => deepFinite(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => (v === null || typeof v === "string" || typeof v === "boolean" ? [] : deepFinite(v, `${path}.${k}`)));
  return [];
}

/** The reconciliations a bank checks, recomputed here independently of the engine's own checks. */
function expectReconciles(report: DprReport, input: DprInput) {
  // Project cost = sum of heads.
  const heads = report.cost.lines.reduce((s, l) => s + l.amount, 0) + report.cost.workingCapital;
  expect(Math.abs(heads - report.cost.total)).toBeLessThanOrEqual(1);
  // Means of finance = project cost (subsidy is not a source).
  const sources = report.means.ownContribution + report.means.termLoan + report.means.ccLimit + report.means.otherFunding;
  expect(Math.abs(sources - report.cost.total)).toBeLessThanOrEqual(1);
  // Loan: every month rolls forward, the loan is fully repaid within tenure.
  let opening = report.means.termLoan;
  for (const r of report.monthly) {
    expect(r.opening).toBeCloseTo(opening, 2);
    expect(r.opening - r.principal - r.subsidyAdjusted).toBeCloseTo(r.closing, 2);
    opening = r.closing;
  }
  if (report.means.termLoan > 0) {
    expect(report.monthly.at(-1)!.closing).toBe(0);
    expect(report.monthly.at(-1)!.month).toBeLessThanOrEqual(Math.round(input.tenureYears * 12));
    expect(report.monthly.reduce((s, r) => s + r.principal + r.subsidyAdjusted, 0)).toBeCloseTo(report.means.termLoan, 1);
  }
  // Yearly repayment = sum of the months.
  for (const [i, y] of report.repayment.entries()) {
    const months = report.monthly.filter((m) => m.month > i * 12 && m.month <= (i + 1) * 12);
    expect(y.principal).toBeCloseTo(months.reduce((s, m) => s + m.principal, 0), 1);
  }
  // Balance sheet balances; cash flow rolls forward and lands on balance-sheet cash.
  let cash = report.implementation.closingCash;
  expect(report.implementation.openingCash + report.implementation.netChange).toBeCloseTo(report.implementation.closingCash, 1);
  for (const [i, y] of report.years.entries()) {
    expect(Math.abs(y.totalAssets - y.totalLiabilities), `${y.label} balance`).toBeLessThanOrEqual(1);
    const cf = report.cashFlow[i];
    expect(cf.openingCash).toBeCloseTo(cash, 0);
    expect(cf.operating + cf.investing + cf.financing).toBeCloseTo(cf.netChange, 0);
    expect(cf.openingCash + cf.netChange).toBeCloseTo(cf.closingCash, 0);
    expect(cf.closingCash).toBeCloseTo(y.cash, 0);
    cash = cf.closingCash;
    // P&L arithmetic.
    expect(y.sales - y.costOfSales).toBeCloseTo(y.grossProfit, 0);
    expect(y.profitBeforeTax - y.tax).toBeCloseTo(y.netProfit, 0);
    // Current ratio from its own parts.
    if (y.currentRatio !== null) expect(y.currentRatio).toBeCloseTo(y.currentAssets / y.currentLiabilities, 1);
  }
  // DSCR recomputed: (PAT + dep + write-off + TL interest) / (TL interest + principal); average = Σnum / Σden.
  let num = 0;
  let den = 0;
  for (const [i, y] of report.years.entries()) {
    const subvention = y.interestSubvention && y.termLoanInterest + y.ccInterest > 0 ? (y.interestSubvention * y.termLoanInterest) / (y.termLoanInterest + y.ccInterest) : 0;
    const interest = y.termLoanInterest - subvention;
    const service = interest + y.principalRepaid;
    if (service <= 0) {
      expect(y.dscr, `${i}`).toBeNull();
      continue;
    }
    expect(y.dscr!).toBeCloseTo((y.cashAccrual + interest) / service, 1);
    num += y.cashAccrual + interest;
    den += service;
  }
  if (den > 0) expect(report.averageDscr!).toBeCloseTo(num / den, 2);
  expect(deepFinite(report)).toEqual([]);
  expect(Object.values(report.checks).every(Boolean)).toBe(true);
  expect(report.errors).toEqual([]);
}

describe("income tax", () => {
  it("new regime: income up to Rs. 12 lakh is tax-free for a proprietor (rebate u/s 87A)", () => {
    expect(incomeTax("proprietorship", "new", 1200000)).toBe(0);
  });
  it("new regime: slab tax with marginal relief just above Rs. 12 lakh, plus 4% cess", () => {
    expect(incomeTax("proprietorship", "new", 1300000)).toBeCloseTo(75000 * 1.04, 2);
    expect(incomeTax("proprietorship", "new", 1250000)).toBeCloseTo(50000 * 1.04, 2);
  });
  it("old regime slabs", () => {
    expect(incomeTax("proprietorship", "old", 500000)).toBe(0);
    expect(incomeTax("proprietorship", "old", 600000)).toBeCloseTo(32500 * 1.04, 2);
  });
  it("firm / LLP at 30% and company at 22% + 10% surcharge, with cess", () => {
    expect(incomeTax("partnership", "new", 1000000)).toBeCloseTo(312000, 2);
    expect(incomeTax("llp", "new", 1000000)).toBeCloseTo(312000, 2);
    expect(incomeTax("private_limited", "new", 1000000)).toBeCloseTo(251680, 2);
  });
  it("no tax on a loss", () => {
    expect(incomeTax("partnership", "new", -50000)).toBe(0);
  });
});

describe("scenarios", () => {
  it("1. manufacturing (worked example, PMEGP)", () => {
    const input = base();
    expectReconciles(buildDpr(input), input);
  });

  it("2. trading (kirana under Mudra)", () => {
    const input = fromTemplate("kirana", 10, { scheme: "mudra" });
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(report.years[0].finishedGoods).toBeGreaterThanOrEqual(0);
  });

  it("3. service (coaching centre)", () => {
    const input = fromTemplate("coaching", 6);
    expectReconciles(buildDpr(input), input);
  });

  it("4. food manufacturing (papad) lists FSSAI in compliance", async () => {
    const input = fromTemplate("papad", 8, { scheme: "pmegp" });
    const report = buildDpr(input);
    expectReconciles(report, input);
    const { complianceFor } = await import("./compliance");
    expect(complianceFor(input, report).some((c) => c.level === "mandatory" && /FSSAI/.test(c.name))).toBe(true);
  });

  it("5. packaged drinking water: FSSAI 2026 testing scheme mandatory, BIS not a national pre-condition", async () => {
    const input = fromTemplate("packaged-water", 20, { scheme: "mysy" });
    const report = buildDpr(input);
    expectReconciles(report, input);
    const { complianceFor } = await import("./compliance");
    const items = complianceFor(input, report);
    expect(items.find((c) => /Scheme of Testing/.test(c.name))?.level).toBe("mandatory");
    expect(items.find((c) => /BIS/.test(c.name))?.level).not.toBe("mandatory");
    // Raw material follows production: preforms per case of 12 bottles.
    const water = report.years[0].materials.find((m) => /preform/i.test(m.name))!;
    expect(water.basis).toBe("linked");
    const cases = report.years[0].production.find((p) => /1 litre/.test(p.name))!.production;
    expect(water.quantity).toBeCloseTo((cases * 12 * 1.02) / 1000, 0);
  });

  it("6. rented premises: missing rent is flagged, and the estimate adds a marked rent line", () => {
    const input = base({ premises: "rented" });
    const before = buildDpr(input);
    expect(before.warnings.some((w) => /Rent/.test(w))).toBe(true);
    expect(before.dataGaps.some((g) => /rent/.test(g))).toBe(true);
    const fixed = withEstimatedCosts(input);
    const rent = fixed.overheads.find((o) => /rent/i.test(o.name))!;
    expect(rent.estimated).toBe(true);
    expect(rent.monthly).toBeGreaterThan(0);
    const after = buildDpr(fixed);
    expect(after.warnings.some((w) => /Rent/.test(w))).toBe(false);
    expect(after.dataGaps.some((g) => /Estimated running costs/.test(g))).toBe(true);
    expect(after.years[0].indirectOverheads).toBeGreaterThan(before.years[0].indirectOverheads);
    expectReconciles(after, fixed);
  });

  it("7. owned premises: no rent expected", () => {
    const report = buildDpr(base({ premises: "owned" }));
    expect(report.warnings.some((w) => /Rent/.test(w))).toBe(false);
  });

  it("8. term loan with moratorium: interest only, then repaid exactly", () => {
    const input = base({ moratoriumMonths: 9, tenureYears: 6 });
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(report.monthly.slice(0, 9).every((m) => m.principal === 0 && m.interest > 0)).toBe(true);
  });

  it("9. term loan without moratorium, EMI and quarterly variants", () => {
    for (const overrides of [
      { moratoriumMonths: 0 },
      { moratoriumMonths: 0, repaymentMethod: "emi" as const },
      { moratoriumMonths: 3, repaymentFrequency: "quarterly" as const },
      { moratoriumMonths: 6, repaymentMethod: "emi" as const, repaymentFrequency: "quarterly" as const },
    ]) {
      const input = base({ ...overrides, scheme: "none" });
      expectReconciles(buildDpr(input), input);
    }
    const emi = loanSchedule({ tenureYears: 5, moratoriumMonths: 0, termLoanInterestPct: 12, repaymentMethod: "emi", repaymentFrequency: "monthly" }, 500000);
    const instalments = emi.slice(0, -1).map((r) => r.instalment);
    expect(Math.max(...instalments) - Math.min(...instalments)).toBeLessThan(1); // level EMI
    expect(emi[0].instalment).toBeCloseTo(11122.22, 0);
  });

  it("10. working capital finance: cash credit and its interest are carried every year", () => {
    const input = base();
    const report = buildDpr(input);
    expect(report.means.ccLimit).toBeGreaterThan(0);
    expect(report.years.every((y) => Math.abs(y.ccInterest - (report.means.ccLimit * input.ccInterestPct) / 100) < 1)).toBe(true);
    expect(report.years.every((y) => y.currentLiabilities >= y.ccLoan)).toBe(true);
  });

  it("11. subsidy project (PMEGP): back-ended, no interest on the TDR portion, adjusted after 3 years", () => {
    const input = base({ scheme: "pmegp" });
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(report.means.subsidy).toBeGreaterThan(0);
    expect(report.means.total).toBeCloseTo(report.cost.total, 0); // subsidy is not a source of funds
    expect(report.implementation.subsidyReceived + report.implementation.subsidyPlacedInTdr).toBeCloseTo(0, 2); // no free cash
    const adjustment = report.monthly.find((m) => m.subsidyAdjusted > 0)!;
    expect(adjustment.month).toBe(36);
    expect(report.years[0].subsidyDeposit).toBe(report.means.subsidy);
    expect(report.years[3].subsidyDeposit).toBe(0);
    // First month interest is on the loan less the subsidy.
    expect(report.monthly[0].interest).toBeCloseTo(((report.means.termLoan - Math.min(report.means.subsidy, report.means.termLoan)) * input.termLoanInterestPct) / 1200, 1);
  });

  it("12. project without subsidy", () => {
    const input = base({ scheme: "none" });
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(report.means.subsidy).toBe(0);
    expect(report.years.every((y) => y.subsidyReserve === 0 && y.subsidyDeposit === 0)).toBe(true);
  });

  it("13. loss-making project still reconciles, carries losses forward and says so", () => {
    const input = base({ scheme: "none", products: [{ name: "Wheat flour (atta)", unit: "quintal", capacity: 3000, price: 2500 }] });
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(report.years[0].netProfit).toBeLessThan(0);
    expect(report.years[0].tax).toBe(0);
    expect(report.warnings.some((w) => /net loss/.test(w))).toBe(true);
  });

  it("14. incomplete input: warnings, no NaN, and it cannot be made final", () => {
    const input = { ...emptyDpr(NOW), businessName: "Half Done" };
    const report = buildDpr(input);
    expect(deepFinite(report)).toEqual([]);
    expect(report.warnings.some((w) => /Products/.test(w))).toBe(true);
    expect(report.warnings.some((w) => /Promoter ka naam/.test(w))).toBe(true);
    expect(finalBlockerFor({ status: "final", input })).not.toBeNull();
  });

  it("15. zero sales / zero production", () => {
    const input = base({ utilisationPct: [0, 0, 0, 0, 0] });
    const report = buildDpr(input);
    expect(deepFinite(report)).toEqual([]);
    expect(report.years[0].sales).toBe(0);
    expect(report.breakEven?.bepCapacityPct ?? null).toBeNull();
    expect(report.years.every((y) => Math.abs(y.balanceDifference) <= 1)).toBe(true);
  });

  it("16. multiple products with process loss, rejection and linked raw material", () => {
    const input = base({
      scheme: "none",
      products: [
        { name: "Atta", unit: "quintal", capacity: 3000, price: 3000, processLossPct: 2, rejectionPct: 1 },
        { name: "Besan", unit: "quintal", capacity: 500, price: 8000, processLossPct: 1, rejectionPct: 0 },
      ],
      rawMaterials: [
        { name: "Wheat", unit: "quintal", quantity: 0, rate: 2400, productIndex: 0, perUnit: 1.03, lossPct: 0 },
        { name: "Chana", unit: "quintal", quantity: 0, rate: 6000, productIndex: 1, perUnit: 1.05, lossPct: 1 },
      ],
    });
    const report = buildDpr(input);
    expectReconciles(report, input);
    const [atta, besan] = report.years[0].production;
    expect(atta.production).toBe(1800);
    expect(atta.saleable).toBeCloseTo(1800 * 0.98 * 0.99, 1);
    expect(atta.netSales).toBeCloseTo(atta.saleable * 3000, 0);
    expect(report.years[0].sales).toBeCloseTo(atta.netSales + besan.netSales, 0);
    expect(report.years[0].materials[1].quantity).toBeCloseTo(300 * 1.05 * 1.01, 1);
    expect(report.years[0].returns).toBeGreaterThan(0);
  });

  it("17. tax regimes and constitutions change the tax line, never silently zero", () => {
    const profitable = base({ scheme: "none", products: [{ name: "Wheat flour (atta)", unit: "quintal", capacity: 6000, price: 3200 }], rawMaterials: [{ name: "Wheat", unit: "quintal", quantity: 0, rate: 2400, productIndex: 0, perUnit: 1.0333 }] });
    const firm = buildDpr({ ...profitable, constitution: "partnership" });
    const company = buildDpr({ ...profitable, constitution: "private_limited" });
    const proprietor = buildDpr({ ...profitable, constitution: "proprietorship", taxRegime: "new" });
    for (const r of [firm, company, proprietor]) expectReconciles(r, profitable);
    const y = 2;
    expect(firm.years[y].tax).toBeGreaterThan(0);
    expect(company.years[y].tax).toBeGreaterThan(0);
    expect(company.depreciationMethod).toBe("SLM");
    expect(firm.depreciationMethod).toBe("WDV");
    expect(firm.years[y].tax).toBeCloseTo(incomeTax("partnership", "new", firm.years[y].taxableIncome - firm.years[y].lossSetOff), 0);
    const manualZero = buildDpr({ ...profitable, taxRegime: "manual", taxPct: 0 });
    expect(manualZero.warnings.some((w) => /Tax 0%/.test(w))).toBe(true);
  });
});

describe("Leaf Beverages (DIGI-DPR-00003) regression", () => {
  const saved = { ...emptyDpr(NOW), ...LEAF_BEVERAGES_SAVED, taxRegime: "new" as const };

  it("flags what the original report hid", () => {
    const report = buildDpr(saved);
    expect(report.warnings.some((w) => /Rent/.test(w))).toBe(true);
    expect(report.warnings.some((w) => /qualification/.test(w))).toBe(true);
    expect(report.warnings.some((w) => /experience/.test(w))).toBe(true);
    expect(report.warnings.some((w) => /quotation/i.test(w))).toBe(true);
    expect(report.dataGaps.some((g) => /not derived from a per-unit consumption/.test(g))).toBe(true);
  });

  it("recalculated with estimates: every statement reconciles, subsidy adjusted, realistic current ratio", () => {
    const input = withEstimatedCosts(saved);
    const report = buildDpr(input);
    expectReconciles(report, input);
    expect(input.overheads.find((o) => /rent/i.test(o.name))?.estimated).toBe(true);
    expect(report.means.subsidy).toBeGreaterThan(0);
    expect(report.repayment.some((r) => r.subsidyAdjusted > 0)).toBe(true);
    expect(report.years[0].currentRatio!).toBeLessThan(3);
    expect(report.taxBasis.regime).toBe("new");
  });
});

describe("typed loans (admin enters what the bank sanctioned)", () => {
  // The case reported: a Rs. 20 lakh MYSY mineral water plant, special category (5% margin).
  const plant = () => fromTemplate("packaged-water", 20, { scheme: "mysy", category: "special" });

  it("quick DPR hits the project cost to the rupee", () => {
    expect(buildDpr(plant()).cost.total).toBe(2000000);
  });

  it("TL 17 lakh + CC 3 lakh on a 20 lakh project: no false 'means exceed' error; the promoter's share comes out nil and is warned", () => {
    const input = { ...plant(), termLoanOverride: 1700000, ccLimitOverride: 300000 };
    const report = buildDpr(input);
    expect(report.means.gap).toBe(0);
    expect(report.errors).toEqual([]);
    expect(report.means.ownContribution).toBe(0);
    expect(report.warnings.some((w) => /kam se kam 5%/.test(w))).toBe(true);
    expectReconciles(report, input);
  });

  it("TL 17 lakh + CC 2 lakh: promoter brings in the 5% (Rs. 1 lakh) and nothing is flagged", () => {
    const input = { ...plant(), termLoanOverride: 1700000, ccLimitOverride: 200000 };
    const report = buildDpr(input);
    expect(report.means.ownContribution).toBe(100000);
    expect(report.means.ownContributionPct).toBe(5);
    expect(report.warnings.some((w) => /Apna hissa|Paisa project cost/.test(w))).toBe(false);
    expectReconciles(report, input);
  });

  it("only the term loan typed: CC takes up the balance", () => {
    const report = buildDpr({ ...plant(), termLoanOverride: 1700000 });
    expect(report.means.ccLimit).toBe(2000000 - 100000 - 1700000);
    expect(report.means.gap).toBe(0);
  });

  it("loans larger than the project: a plain explanation with the arithmetic", () => {
    const report = buildDpr({ ...plant(), termLoanOverride: 1800000, ccLimitOverride: 300000 });
    const message = report.errors.join(" ");
    expect(message).toContain("Loan project cost se Rs. 1 lakh zyada");
    expect(message).toContain("term loan Rs. 18 lakh + CC Rs. 3 lakh");
    expect(message).toContain("zyada se zyada Rs. 19 lakh");
  });
});

describe("one machine of Rs. 17 lakh with TL 17 + CC 3 (the reported case, as saved)", () => {
  const saved = () => {
    const input = fromTemplate("packaged-water", 20, { scheme: "mysy", category: "special" });
    return { ...input, capitalItems: [{ kind: "machinery" as const, description: "PET Blowing Machine (3000 BPH)", quantity: 1, rate: 1700000, supplier: "Supplier", quotationRef: "Q-1" }], termLoanOverride: 1700000, ccLimitOverride: 300000 };
  };
  it("explains that the project is smaller than the loans and how much loan fits", () => {
    const report = buildDpr(saved());
    expect(report.cost.total).toBeLessThan(2000000);
    const msg = report.errors.join(" ");
    expect(msg).toContain("Is DPR ka project cost");
    expect(msg).toContain("machinery / saaman Rs. 17 lakh");
    expect(msg).toMatch(/zyada se zyada Rs\. [\d.]+ lakh/);
  });
  it("clearing the typed loans balances it with the scheme's 5%", () => {
    const report = buildDpr({ ...saved(), termLoanOverride: null, ccLimitOverride: null });
    expect(report.errors).toEqual([]);
    expect(report.means.ownContributionPct).toBe(5);
    expect(report.means.ccLimit).toBeLessThanOrEqual(report.cost.workingCapital);
  });
});

describe("a machine entered under the wrong head", () => {
  it("warns when preliminary expenses are an unusual share of the project", () => {
    const input = fromTemplate("packaged-water", 20, { scheme: "mysy" });
    const wrong = { ...input, capitalItems: [{ kind: "preliminary" as const, description: "PET Blowing Machine", quantity: 1, rate: 1700000 }] };
    expect(buildDpr(wrong).warnings.some((w) => /Plant & machinery/.test(w))).toBe(true);
    expect(buildDpr(input).warnings.some((w) => /Plant & machinery/.test(w))).toBe(false);
  });
});

describe("the maximum loan uses the percent the admin typed", () => {
  it("5% typed under MYSY General (scheme 10%): message says 5%", () => {
    const input = { ...fromTemplate("packaged-water", 20, { scheme: "mysy" }), ownContributionPct: 5, termLoanOverride: 1800000, ccLimitOverride: 300000 };
    const msg = buildDpr(input).errors.join(" ");
    expect(msg).toContain("5% apna paisa");
    expect(msg).toContain("zyada se zyada Rs. 19 lakh");
  });
});
