import { describe, expect, it } from "vitest";

import { buildStatements, defaultProjection } from "./engine";
import { quickBalanceSheet, type QuickInput } from "./quick";

const base: QuickInput = {
  kind: "trading",
  constitution: "proprietorship",
  hasActual: true,
  sales: 2500000,
  netProfit: 210000,
  closingStock: null,
  cashAndBank: null,
  fixedAssets: null,
  loanOutstanding: null,
  scheme: "none",
  schemeArea: "urban",
  schemeCategory: "general",
  machineryCost: 0,
  workingCapital: 500000,
  ownPct: null,
  interestPct: 10,
  tenureYears: 5,
  salesGrowthPct: 10,
};

function statementsFor(q: QuickInput) {
  const result = quickBalanceSheet(q);
  if (typeof result === "string") throw new Error(result);
  const statements = buildStatements({ baseYear: 2025, hasActual: q.hasActual, constitution: q.constitution, actual: result.actual, projection: { ...defaultProjection(), ...result.projection } });
  return { result, statements };
}

describe("quick balance sheet", () => {
  it.each(["trading", "manufacturing", "service"] as const)("%s: from turnover and profit the actual year tallies and shows the ITR profit", (kind) => {
    const { result, statements } = statementsFor({ ...base, kind });
    const actual = statements.periods.find((p) => p.kind === "actual")!;
    expect(statements.tallies).toBe(true);
    expect(actual.bs.difference).toBe(0);
    expect(actual.pl.sales).toBe(2500000);
    expect(actual.pl.profitBeforeTax).toBe(210000);
    for (const [key, value] of Object.entries(result.actual)) expect(value, key).toBeGreaterThanOrEqual(0);
    expect(statements.periods.filter((p) => p.kind === "projected")).toHaveLength(5);
    for (const p of statements.periods) expect(Math.abs(p.bs.difference), p.label).toBeLessThanOrEqual(1);
  });

  it("uses what the customer knows: stock, cash, machinery and loan", () => {
    const { result, statements } = statementsFor({ ...base, closingStock: 400000, cashAndBank: 60000, fixedAssets: 300000, loanOutstanding: 150000 });
    expect(result.actual).toMatchObject({ closingStock: 400000, cashAndBank: 60000, fixedAssets: 300000, termLoan: 150000 });
    expect(statements.tallies).toBe(true);
  });

  it("puts the margin on both parts of the new loan", () => {
    const { result } = statementsFor({ ...base, machineryCost: 300000, workingCapital: 200000, ownPct: 12.5 });
    expect(result.projection.newTermLoan).toBe(262500);
    expect(result.projection.ccLimit).toBe(175000);
    expect(result.projection.capitalIntroducedYear1).toBe(62500);
    expect(result.loanAmount).toBe(437500);
  });

  it("builds a new business from expected sales alone", () => {
    const { statements } = statementsFor({ ...base, hasActual: false, netProfit: 0, scheme: "mysy", machineryCost: 600000, workingCapital: 400000 });
    expect(statements.periods.every((p) => p.kind === "projected")).toBe(true);
    expect(statements.periods[0].pl.sales).toBe(2500000);
    for (const p of statements.periods) expect(Math.abs(p.bs.difference), p.label).toBeLessThanOrEqual(1);
  });

  it("explains impossible figures instead of producing a sheet", () => {
    expect(quickBalanceSheet({ ...base, sales: 0 })).toMatch(/turnover/);
    expect(quickBalanceSheet({ ...base, netProfit: 3000000 })).toMatch(/kam hona/);
    expect(quickBalanceSheet({ ...base, loanOutstanding: 3000000 })).toMatch(/Loan outstanding/);
  });
});
