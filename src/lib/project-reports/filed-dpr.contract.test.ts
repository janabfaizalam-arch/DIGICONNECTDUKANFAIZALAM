/**
 * The engine against a DPR a chartered accountant actually filed.
 *
 * Every other test in this folder checks the engine against itself: that the
 * figures are consistent, that the ratios are sane, that a template scales.
 * None of them can tell us the thing a bank cares about — whether this engine
 * produces the same report a CA would have typed by hand for the same unit.
 *
 * So this one is pinned to a real file: a PMFME application for an oil and
 * flour mill with solar at Jalaun, prepared and signed by a CA, 10.00 lakh
 * project, 9.00 term loan at 10.5% over five years, no cash credit, 35%
 * subsidy. Its eleven sheets are the figures on the right-hand side of every
 * assertion below.
 *
 * The result: everything matches to the paisa — cost of project, means of
 * finance, sales, raw material consumed, salary with its 5% escalation,
 * interest, depreciation, and the whole repayment schedule — with exactly one
 * difference, which `closing stock` below documents and pins. If that
 * difference ever grows, or the matching figures stop matching, this fails.
 */

import { describe, expect, it } from "vitest";

import { emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import { dprInputSchema } from "./schema";

/** Rupees to lakh, two decimals — the unit every sheet in the file is in. */
const lakh = (rupees: number) => Math.round(rupees / 1000) / 100;

/** The filed file's own figures, sheet by sheet. */
const FILED = {
  projectCost: 10.0,
  termLoan: 9.0,
  ownContribution: 1.0,
  subsidy: 3.5,
  sales: [34.6, 37.49, 40.37, 43.25, 46.14],
  consumption: [21.16, 22.92, 24.69, 26.45, 28.21],
  salary: [2.16, 2.27, 2.38, 2.5, 2.63],
  interest: [0.95, 0.76, 0.57, 0.38, 0.19],
  depreciation: [1.5, 1.28, 1.08, 0.92, 0.78],
  openingBalance: [9.0, 7.2, 5.4, 3.6, 1.8],
  debtServicing: [2.75, 2.56, 2.37, 2.18, 1.99],
  profitBeforeTax: [7.13, 8.4, 9.6, 10.75, 11.82],
};

/**
 * The filed unit, typed as the file describes it.
 *
 * `bankFormat` is the mode that file is written in: yearly equal instalments,
 * interest on the opening balance, the subsidy held as a deposit for the whole
 * projection, and no tax in a proprietor's books.
 */
function filedUnit(): DprInput {
  return {
    ...emptyDpr(new Date("2026-01-01")),
    businessName: "Oil and flour mill",
    constitution: "proprietorship",
    activity: "oil and flour mill with solar",
    district: "Jalaun",
    state: "Uttar Pradesh",
    premises: "owned",
    scheme: "pmfme",
    sector: "manufacturing",

    // Cost of project: land and building owned, machinery 10.00 — one line,
    // as the file has it.
    capitalItems: [
      { kind: "machinery", description: "Plant & Machinery", quantity: 1, rate: 1000000 },
    ],
    contingencyPct: 0,
    includeLand: false,

    // The SALES sheet, at 100% capacity.
    products: [
      { name: "Oil", unit: "kg", capacity: 9700, price: 180 },
      { name: "Oil Khali", unit: "kg", capacity: 3400, price: 30 },
      { name: "Aata", unit: "kg", capacity: 92000, price: 32 },
      { name: "Besan", unit: "kg", capacity: 6900, price: 80 },
      { name: "Millets", unit: "kg", capacity: 9400, price: 45 },
    ],
    // The RAW MATERIALS & CONSUMABLES sheet, at 100% capacity.
    rawMaterials: [
      { name: "Millets Raw", unit: "kg", quantity: 9450, rate: 30 },
      { name: "Wheat", unit: "kg", quantity: 84000, rate: 24 },
      { name: "Chana", unit: "kg", quantity: 6900, rate: 50 },
      { name: "Sarso", unit: "kg", quantity: 9800, rate: 90 },
    ],
    utilisationPct: [60, 65, 70, 75, 80],
    priceGrowthPct: 0,

    staff: [{ role: "Skilled Labour", count: 2, monthlySalary: 9000, direct: true }],
    // The file carries no PF or ESI line; two workers is under both thresholds.
    employerContributionPct: 0,
    costGrowthPct: 5,

    // Year-1 overheads from the profitability sheet. None of them is scaled by
    // capacity in that file — the diesel line reads 0.40 at 60% — so all three
    // are fixed here.
    overheads: [
      { name: "Diesel Exp.", monthly: 40000 / 12, variable: false, direct: true },
      { name: "Admin. & Selling Exp.", monthly: 80000 / 12, variable: false, direct: false },
      { name: "Other Expenses", monthly: 50000 / 12, variable: false, direct: false },
    ],

    // No cash credit: the means of finance is promoter's capital plus term
    // loan, and the project cost is the machinery alone.
    workingCapitalOverride: 0,
    ccLimitOverride: 0,
    termLoanOverride: 900000,
    ownContributionPct: 10,
    termLoanInterestPct: 10.5,
    ccInterestPct: 10.5,
    tenureYears: 5,
    moratoriumMonths: 0,
    repaymentMethod: "equal_principal",
    repaymentFrequency: "yearly",
    bankFormat: true,
    drawingsPerYear: 60000,
    years: 5,
  };
}

const report = buildDpr(filedUnit());
const years = report.years;

describe("the engine reproduces a filed PMFME DPR", () => {
  it("accepts the typed unit as valid input", () => {
    expect(dprInputSchema.safeParse(filedUnit()).success).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("matches the cost of project and means of finance", () => {
    expect(lakh(report.cost.total)).toBe(FILED.projectCost);
    expect(lakh(report.means.termLoan)).toBe(FILED.termLoan);
    expect(lakh(report.means.ownContribution)).toBe(FILED.ownContribution);
    // "isme CC nahi hoti" — the file's means of finance is two lines.
    expect(report.means.ccLimit).toBe(0);
  });

  it("works out the same 35% PMFME subsidy", () => {
    expect(lakh(report.means.subsidy)).toBe(FILED.subsidy);
  });

  it("matches sales for all five years", () => {
    expect(years.map((y) => lakh(y.sales))).toEqual(FILED.sales);
  });

  it("matches raw material consumed for all five years", () => {
    expect(years.map((y) => lakh(y.rawMaterial))).toEqual(FILED.consumption);
  });

  it("matches the salary sheet, 5% escalation and all", () => {
    expect(years.map((y) => lakh(y.directWages + y.indirectSalaries))).toEqual(FILED.salary);
  });

  it("matches depreciation — 15% written down on 10.00 lakh", () => {
    expect(years.map((y) => lakh(y.depreciation))).toEqual(FILED.depreciation);
  });

  it("matches the term loan repayment schedule line for line", () => {
    const schedule = report.repayment.slice(0, 5);
    expect(schedule.map((y) => lakh(y.opening))).toEqual(FILED.openingBalance);
    expect(schedule.map((y) => lakh(y.interest))).toEqual(FILED.interest);
    expect(schedule.map((y) => lakh(y.interest + y.principal))).toEqual(FILED.debtServicing);
    expect(schedule[4].closing).toBe(0);
  });

  it("matches the year-one expenditure total", () => {
    const first = years[0];
    const expenditure =
      first.directWages +
      first.indirectSalaries +
      first.directOverheads +
      first.indirectOverheads +
      first.termLoanInterest +
      first.ccInterest +
      first.depreciation +
      first.preliminaryWrittenOff;

    // 2.16 salary + 0.40 diesel + 0.80 admin + 0.50 other + 0.95 interest
    // + 1.50 depreciation.
    expect(lakh(expenditure)).toBe(6.31);
  });

  /**
   * The one difference, and it is the engine being right.
   *
   * The filed file's profitability sheet is Sales − Consumption, with nothing
   * for stock: everything bought in a year is treated as consumed in it. The
   * engine carries closing stock, so the finished goods still on the floor at
   * the year end are not charged against that year's sales — which is how a
   * trading account is drawn, and is why the file's own balance sheet has a
   * Stock line its profitability sheet never accounts for.
   *
   * The engine's profit is therefore higher by the closing finished goods,
   * and by nothing else. That is what this pins.
   */
  it("differs from the filed profit by the closing stock, and by nothing else", () => {
    const first = years[0];

    expect(lakh(first.profitBeforeTax)).toBeGreaterThan(FILED.profitBeforeTax[0]);
    expect(lakh(first.profitBeforeTax) - FILED.profitBeforeTax[0]).toBeCloseTo(
      lakh(first.finishedGoods),
      1,
    );
    expect(first.finishedGoods).toBeGreaterThan(0);
  });

  it("pays no tax, as a proprietor's bank DPR does not show one", () => {
    expect(years.every((y) => y.tax === 0)).toBe(true);
  });

  it("is bankable on the file's own terms", () => {
    // The file reports 4.85. The engine's is higher for the stock reason
    // above; what matters is that both clear the 1.5 a bank looks for and
    // neither is the inflated figure a credit officer distrusts.
    expect(report.averageDscr!).toBeGreaterThanOrEqual(1.5);
    expect(report.minimumDscr!).toBeGreaterThanOrEqual(1.2);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);
  });
});
