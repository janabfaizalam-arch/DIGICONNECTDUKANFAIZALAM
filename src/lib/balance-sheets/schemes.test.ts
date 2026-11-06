import { describe, expect, it } from "vitest";

import { buildStatements, defaultProjection, emptyActual, projectFinanceOf, type BalanceSheetFigures, type ProjectionAssumptions } from "@/lib/balance-sheets/engine";
import { mudraCategory, schemeSuggestion, schemeTerms } from "@/lib/balance-sheets/schemes";

const borrower = { sector: "manufacturing", area: "urban", category: "general" } as const;

function newBusiness(projection: Partial<ProjectionAssumptions>): BalanceSheetFigures {
  return {
    baseYear: 2025,
    hasActual: false,
    constitution: "proprietorship",
    actual: emptyActual(),
    projection: { ...defaultProjection(), years: 3, year1Sales: 1_500_000, materialCostPct: 70, indirectExpensesYear1: 150_000, ...projection },
  };
}

describe("scheme terms", () => {
  it("PMEGP subsidy follows category and area", () => {
    expect(schemeTerms("pmegp", borrower)?.subsidyPct).toBe(15);
    expect(schemeTerms("pmegp", { ...borrower, area: "rural" })?.subsidyPct).toBe(25);
    expect(schemeTerms("pmegp", { ...borrower, category: "special" })?.subsidyPct).toBe(25);
    expect(schemeTerms("pmegp", { ...borrower, area: "rural", category: "special" })?.subsidyPct).toBe(35);
    expect(schemeTerms("pmegp", { ...borrower, category: "special" })?.ownContributionPct).toBe(5);
  });

  it("PMEGP and MYSY caps depend on the sector", () => {
    expect(schemeTerms("pmegp", borrower)?.maxProjectCost).toBe(5_000_000);
    expect(schemeTerms("pmegp", { ...borrower, sector: "service" })?.maxProjectCost).toBe(2_000_000);
    expect(schemeTerms("mysy", borrower)?.maxProjectCost).toBe(2_500_000);
    expect(schemeTerms("mysy", { ...borrower, sector: "service" })?.maxProjectCost).toBe(1_000_000);
  });

  it("CM-YUVA is a composite, interest-free loan up to Rs. 5 lakh", () => {
    const terms = schemeTerms("cmyuva", borrower)!;
    expect(terms.maxLoan).toBe(500_000);
    expect(terms.needsComposite).toBe(true);
    expect(terms.interestSubventionPct).toBe(100);
    expect(terms.interestSubventionYears).toBe(4);
    expect(terms.subsidyCap).toBe(50_000);
  });

  it("an ordinary bank loan has no terms", () => {
    expect(schemeTerms("none", borrower)).toBeNull();
  });

  it("Mudra categories by amount", () => {
    expect(mudraCategory(50_000)?.name).toBe("Shishu");
    expect(mudraCategory(300_000)?.name).toBe("Kishore");
    expect(mudraCategory(800_000)?.name).toBe("Tarun");
    expect(mudraCategory(1_500_000)?.name).toBe("Tarun Plus");
    expect(mudraCategory(2_100_000)).toBeNull();
  });
});

describe("scheme suggestion", () => {
  it("PMEGP rural general: 10% own, 25% back-ended subsidy, bank lends the rest split by asset", () => {
    const terms = schemeTerms("pmegp", { ...borrower, area: "rural" })!;
    const plan = schemeSuggestion(terms, { fixedAssets: 800_000, workingCapital: 200_000 });
    expect(plan).toMatchObject({ cost: 1_000_000, ownContribution: 100_000, subsidy: 250_000, bankLoan: 900_000, ccLimit: 180_000, termLoan: 720_000 });
  });

  it("caps the CM-YUVA subsidy at Rs. 50,000", () => {
    const plan = schemeSuggestion(schemeTerms("cmyuva", borrower)!, { fixedAssets: 400_000, workingCapital: 100_000 });
    expect(plan.subsidy).toBe(50_000);
    expect(plan.termLoan + plan.ccLimit + plan.ownContribution).toBe(500_000);
  });
});

describe("engine with a CC limit, subsidy and interest subvention", () => {
  const figures = newBusiness({
    capitalIntroducedYear1: 100_000,
    newFixedAssets: 800_000,
    workingCapitalNeed: 200_000,
    newTermLoan: 720_000,
    loanTenureYears: 5,
    loanInterestPct: 10,
    ccLimit: 180_000,
    ccInterestPct: 11,
    subsidyAmount: 250_000,
    interestSubventionPct: 100,
    interestSubventionYears: 2,
  });
  const statements = buildStatements(figures);
  const [y1, y2, y3] = statements.periods;

  it("still tallies every projected year", () => {
    for (const period of statements.periods) {
      expect(Math.abs(period.bs.totalAssets - period.bs.totalLiabilities)).toBeLessThan(0.02);
    }
  });

  it("keeps the CC limit fully drawn and charges its interest", () => {
    expect([y1.bs.ccLoan, y2.bs.ccLoan, y3.bs.ccLoan]).toEqual([180_000, 180_000, 180_000]);
    // Term 720,000 x 10% + CC 180,000 x 11%
    expect(y1.pl.interest).toBe(91_800);
  });

  it("deducts the subvention only for the scheme years", () => {
    expect(y1.pl.interestSubvention).toBe(91_800);
    expect(y2.pl.interestSubvention).toBeGreaterThan(0);
    expect(y3.pl.interestSubvention).toBe(0);
  });

  it("shows the back-ended subsidy on both sides, so it adds no cash", () => {
    const without = buildStatements({ ...figures, projection: { ...figures.projection, subsidyAmount: 0 } });
    expect(y1.bs.subsidyReserve).toBe(250_000);
    expect(y1.bs.subsidyDeposit).toBe(250_000);
    expect(y1.bs.cashAndBank).toBe(without.periods[0].bs.cashAndBank);
    expect(y1.pl.netProfit).toBe(without.periods[0].pl.netProfit);
  });

  it("leaves the CC out of debt service in the DSCR", () => {
    // Principal = 720,000 / 5; interest = term loan only.
    expect(y1.ratios.principalRepayment).toBe(144_000);
    expect(y1.ratios.termLoanInterest).toBe(72_000);
  });

  it("reports project cost and means of finance", () => {
    expect(statements.projectFinance).toMatchObject({ totalCost: 1_000_000, totalMeans: 1_000_000, gap: 0, subsidy: 250_000 });
    expect(projectFinanceOf(defaultProjection())).toBeNull();
  });
});
