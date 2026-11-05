import { describe, expect, it } from "vitest";

import {
  buildStatements,
  defaultProjection,
  effectiveAssumptions,
  emptyActual,
  formatAmount,
  fyLabel,
  type BalanceSheetFigures,
} from "@/lib/balance-sheets/engine";

/** A small trading business whose books tally exactly. */
function tallyingTrader(): BalanceSheetFigures {
  return {
    baseYear: 2025,
    hasActual: true,
    constitution: "proprietorship",
    actual: {
      ...emptyActual(),
      sales: 2_000_000,
      openingStock: 200_000,
      purchases: 1_500_000,
      directExpenses: 100_000,
      closingStock: 300_000,
      salaries: 120_000,
      rent: 60_000,
      adminExpenses: 40_000,
      otherExpenses: 20_000,
      interest: 30_000,
      depreciation: 30_000,
      // Gross profit 500,000; net profit 200,000.
      openingCapital: 500_000,
      drawings: 100_000,
      // Closing capital 600,000.
      termLoan: 200_000,
      creditors: 150_000,
      otherCurrentLiabilities: 50_000,
      // Liabilities 1,000,000.
      fixedAssets: 300_000,
      debtors: 250_000,
      cashAndBank: 150_000,
      // Assets 300,000 + 300,000 stock + 250,000 + 150,000 = 1,000,000.
    },
    projection: { ...defaultProjection(), years: 3 },
  };
}

describe("actual year", () => {
  it("builds the trading and profit & loss account from the figures", () => {
    const { periods } = buildStatements(tallyingTrader());
    const actual = periods[0];
    expect(actual.kind).toBe("actual");
    expect(actual.pl.costOfSales).toBe(1_500_000);
    expect(actual.pl.grossProfit).toBe(500_000);
    expect(actual.pl.netProfit).toBe(200_000);
    expect(actual.bs.closingCapital).toBe(600_000);
  });

  it("reports a tallying sheet as tallying", () => {
    const statements = buildStatements(tallyingTrader());
    expect(statements.periods[0].bs.difference).toBe(0);
    expect(statements.tallies).toBe(true);
  });

  it("never adjusts figures that do not tally — it reports the difference", () => {
    const figures = tallyingTrader();
    figures.actual.cashAndBank = 140_000;
    const statements = buildStatements(figures);
    expect(statements.periods[0].bs.cashAndBank).toBe(140_000);
    expect(statements.periods[0].bs.difference).toBe(10_000);
    expect(statements.tallies).toBe(false);
    expect(statements.warnings.join(" ")).toMatch(/tally nahi ho rahi/);
  });
});

describe("projected years", () => {
  it("balances every projected year to the rupee", () => {
    const figures = tallyingTrader();
    figures.projection = { ...defaultProjection(), years: 5, newTermLoan: 500_000, newFixedAssets: 400_000, taxPct: 10 };
    const { periods } = buildStatements(figures);
    for (const period of periods.filter((p) => p.kind === "projected")) {
      expect(Math.abs(period.bs.totalLiabilities - period.bs.totalAssets), period.label).toBeLessThanOrEqual(0.05);
    }
  });

  it("labels the years that follow the actual year", () => {
    const { periods } = buildStatements(tallyingTrader());
    expect(periods.map((p) => p.label)).toEqual([
      "FY 2025-26 (Actual)",
      "FY 2026-27 (Projected)",
      "FY 2027-28 (Projected)",
      "FY 2028-29 (Projected)",
    ]);
    expect(periods[1].yearEnd).toBe("31st March 2027");
  });

  it("carries the closing position forward as the next opening position", () => {
    const { periods } = buildStatements(tallyingTrader());
    expect(periods[1].bs.openingCapital).toBe(periods[0].bs.closingCapital);
    expect(periods[1].pl.openingStock).toBe(periods[0].pl.closingStock);
    expect(periods[2].bs.openingCapital).toBe(periods[1].bs.closingCapital);
  });

  it("reads the ratios off the customer's own books when they are left blank", () => {
    const assumptions = effectiveAssumptions(tallyingTrader());
    expect(assumptions.materialCostPct).toBe(75);
    expect(assumptions.debtorDays).toBe(46);
    expect(assumptions.derived).toContain("Material cost %");
  });

  it("keeps a typed assumption instead of the derived one", () => {
    const figures = tallyingTrader();
    figures.projection.materialCostPct = 60;
    expect(effectiveAssumptions(figures).materialCostPct).toBe(60);
    expect(effectiveAssumptions(figures).derived).not.toContain("Material cost %");
  });

  it("shows a funding gap as a bank overdraft, never as negative cash", () => {
    const figures = tallyingTrader();
    figures.projection = { ...defaultProjection(), years: 2, newFixedAssets: 5_000_000 };
    const { periods, warnings } = buildStatements(figures);
    const first = periods[1];
    expect(first.bs.cashAndBank).toBe(0);
    expect(first.bs.bankOverdraft).toBeGreaterThan(0);
    expect(warnings.join(" ")).toMatch(/bank overdraft/);
  });

  it("repays the term loan in equal instalments and works out DSCR", () => {
    const figures = tallyingTrader();
    figures.actual.termLoan = 0;
    figures.actual.otherCurrentLiabilities = 250_000;
    figures.projection = { ...defaultProjection(), years: 5, newTermLoan: 500_000, loanTenureYears: 5, loanInterestPct: 10 };
    const projected = buildStatements(figures).periods.filter((p) => p.kind === "projected");
    expect(projected.map((p) => p.bs.termLoan)).toEqual([400_000, 300_000, 200_000, 100_000, 0]);
    expect(projected[0].ratios.termLoanInterest).toBe(50_000);
    expect(projected[0].ratios.principalRepayment).toBe(100_000);
    expect(projected[0].ratios.dscr).toBeGreaterThan(1);
  });
});

describe("a new business with no actual year", () => {
  it("starts from the capital and loan that fund it", () => {
    const figures: BalanceSheetFigures = {
      baseYear: 2025,
      hasActual: false,
      constitution: "proprietorship",
      actual: emptyActual(),
      projection: {
        ...defaultProjection(),
        years: 3,
        year1Sales: 1_200_000,
        materialCostPct: 65,
        indirectExpensesYear1: 180_000,
        capitalIntroducedYear1: 200_000,
        newFixedAssets: 600_000,
        newTermLoan: 500_000,
      },
    };
    const statements = buildStatements(figures);
    expect(statements.periods).toHaveLength(3);
    expect(statements.periods[0].kind).toBe("projected");
    expect(statements.periods[0].pl.sales).toBe(1_200_000);
    expect(statements.periods[0].bs.openingCapital).toBe(0);
    expect(statements.tallies).toBe(true);
    for (const period of statements.periods) {
      expect(Math.abs(period.bs.totalLiabilities - period.bs.totalAssets)).toBeLessThanOrEqual(0.05);
    }
  });
});

describe("formatting", () => {
  it("groups digits the Indian way", () => {
    expect(formatAmount(1234567)).toBe("12,34,567.00");
    expect(formatAmount(999)).toBe("999.00");
    expect(formatAmount(-100000.5)).toBe("-1,00,000.50");
  });

  it("names financial years the way banks write them", () => {
    expect(fyLabel(2025)).toBe("FY 2025-26");
    expect(fyLabel(2099)).toBe("FY 2099-00");
  });
});
