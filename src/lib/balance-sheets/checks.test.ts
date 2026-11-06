import { describe, expect, it } from "vitest";

import { checkBalanceSheet, FIELD_LABELS, FIELD_ORDER, isValidNumberText, type CheckInput, type DetailKey } from "@/lib/balance-sheets/checks";
import { buildStatements, defaultProjection, emptyActual, type ActualFigures, type ProjectionAssumptions } from "@/lib/balance-sheets/engine";

const TALLYING: Partial<ActualFigures> = {
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
  openingCapital: 500_000,
  drawings: 100_000,
  termLoan: 200_000,
  creditors: 150_000,
  otherCurrentLiabilities: 50_000,
  fixedAssets: 300_000,
  debtors: 250_000,
  cashAndBank: 150_000,
};

const DETAILS: Record<DetailKey, string> = {
  businessName: "Shree Ganesh Traders",
  ownerName: "Ramesh Kumar",
  pan: "ABCDE1234F",
  gstin: "09ABCDE1234F1Z5",
  mobile: "9876543210",
  pincode: "285001",
  email: "ramesh@example.com",
  loanAmount: "",
};

/** Builds the check input the way the form does: text in, statements from the same numbers. */
function run({
  actual = {},
  projection = {},
  details = {},
  hasActual = true,
  showRequired = true,
}: {
  actual?: Partial<Record<keyof ActualFigures, string | number>>;
  projection?: Partial<Record<keyof ProjectionAssumptions, string | number | null>>;
  details?: Partial<Record<DetailKey, string>>;
  hasActual?: boolean;
  showRequired?: boolean;
} = {}) {
  const actualValues = { ...emptyActual(), ...TALLYING, ...actual };
  const actualText = Object.fromEntries(Object.entries(actualValues).map(([k, v]) => [k, String(v ?? "")])) as CheckInput["actualText"];
  const projectionValues = { ...defaultProjection(), years: 3, ...projection };
  const projectionText = Object.fromEntries(
    Object.entries(projectionValues).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]),
  ) as CheckInput["projectionText"];
  const num = (t: string) => (Number.isFinite(Number(t.replace(/,/g, ""))) ? Number(t.replace(/,/g, "")) : 0);
  const statements = buildStatements({
    baseYear: 2025,
    hasActual,
    constitution: "proprietorship",
    actual: Object.fromEntries(Object.entries(actualText).map(([k, t]) => [k, num(t)])) as ActualFigures,
    projection: Object.fromEntries(
      Object.entries(projectionText).map(([k, t]) => [k, t === "" && (defaultProjection() as Record<string, unknown>)[k] === null ? null : num(t)]),
    ) as ProjectionAssumptions,
  });
  return checkBalanceSheet({
    details: { ...DETAILS, ...details },
    hasActual,
    actualText,
    projectionText,
    statements,
    showRequired,
    touched: new Set(),
  });
}

describe("a correct sheet", () => {
  it("has no errors and no warnings", () => {
    const result = run();
    expect(result.issues).toEqual({});
    expect(result.errorCount).toBe(0);
  });
});

describe("number format", () => {
  it("accepts plain and Indian-grouped figures and rejects broken ones", () => {
    for (const ok of ["", "0", "250000", "2,50,000", "1500.50", ".5"]) expect(isValidNumberText(ok)).toBe(true);
    for (const bad of ["12.3.4", "1..2", ".", ","]) expect(isValidNumberText(bad)).toBe(false);
  });

  it("marks the box with the broken figure", () => {
    expect(run({ actual: { rent: "60.000.00" } }).issues["actual.rent"]).toMatchObject({ level: "error", message: expect.stringMatching(/sahi number nahi/) });
  });
});

describe("balance sheet does not tally", () => {
  it("puts the error on cash and says what cash should be", () => {
    const issue = run({ actual: { cashAndBank: 140_000 } }).issues["actual.cashAndBank"];
    expect(issue?.level).toBe("error");
    expect(issue?.message).toMatch(/Liabilities .* se Rs\. 10,000\.00 zyada hain/);
    expect(issue?.message).toMatch(/cash and bank Rs\. 1,50,000\.00 hona chahiye/);
  });

  it("explains the other direction too", () => {
    const issue = run({ actual: { debtors: 260_000 } }).issues["actual.cashAndBank"];
    expect(issue?.message).toMatch(/Assets .* se Rs\. 10,000\.00 zyada hain/);
    expect(issue?.message).toMatch(/Rs\. 1,40,000\.00 hona chahiye/);
  });

  it("does not suggest a cash figure while another box is unreadable", () => {
    const message = run({ actual: { rent: "60.000.00" } }).issues["actual.cashAndBank"]?.message ?? "";
    expect(message).toMatch(/Rent mein sahi number nahi hai, theek hone tak wo 0 gina jaayega/);
    expect(message).not.toMatch(/hona chahiye/);
  });

  it("says when even nil cash cannot close the gap", () => {
    expect(run({ actual: { debtors: 600_000 } }).issues["actual.cashAndBank"]?.message).toMatch(/Cash zero karne par bhi/);
  });
});

describe("figures that cannot be right", () => {
  it("closing stock larger than everything available", () => {
    const issue = run({ actual: { closingStock: 2_000_000 } }).issues["actual.closingStock"];
    expect(issue).toMatchObject({ level: "error" });
    expect(issue?.message).toMatch(/Rs\. 18,00,000\.00/);
  });

  it("tax above the profit, and tax on a loss", () => {
    expect(run({ actual: { tax: 250_000, cashAndBank: 0 } }).issues["actual.tax"]?.message).toMatch(/profit before tax \(Rs\. 2,00,000\.00\) se zyada hai/);
    expect(run({ actual: { sales: 1_000_000, tax: 1000 } }).issues["actual.tax"]?.message).toMatch(/profit before tax nahi hai/);
  });

  it("drawings that make capital negative", () => {
    expect(run({ actual: { drawings: 900_000 } }).issues["actual.drawings"]?.level).toBe("error");
  });

  it("no sales but expenses filled", () => {
    expect(run({ actual: { sales: 0 } }).issues["actual.sales"]?.level).toBe("error");
  });
});

describe("figures a bank will ask about", () => {
  it("interest with no loan, and a loan with no interest", () => {
    expect(run({ actual: { termLoan: 0, otherCurrentLiabilities: 250_000 } }).issues["actual.interest"]?.level).toBe("warning");
    expect(run({ actual: { interest: 0, otherExpenses: 50_000 } }).issues["actual.interest"]?.message).toMatch(/koi byaaj nahi/);
  });

  it("debtors above a year's sales", () => {
    expect(run({ actual: { sales: 200_000 } }).issues["actual.debtors"]?.level).toBe("warning");
  });
});

describe("customer details", () => {
  it("PAN and GSTIN format, and a GSTIN of a different PAN", () => {
    expect(run({ details: { pan: "ABCD1234F" } }).issues.pan?.level).toBe("error");
    expect(run({ details: { gstin: "09ABCDE1234F" } }).issues.gstin?.message).toMatch(/15 character ka hota hai/);
    expect(run({ details: { gstin: "09PQRST6789K1Z5" } }).issues.gstin?.message).toMatch(/PAN PQRST6789K ka hai/);
  });

  it("mobile and pincode say what is wrong", () => {
    expect(run({ details: { mobile: "98765" } }).issues.mobile?.message).toMatch(/5 digit hain, 10 chahiye/);
    expect(run({ details: { mobile: "1234567890" } }).issues.mobile?.message).toMatch(/6, 7, 8 ya 9 se shuru/);
    expect(run({ details: { pincode: "28500" } }).issues.pincode?.message).toMatch(/6 chahiye/);
  });

  it("waits for a save attempt before calling a name missing", () => {
    expect(run({ details: { businessName: "" }, showRequired: false }).issues.businessName).toBeUndefined();
    expect(run({ details: { businessName: "" } }).issues.businessName?.level).toBe("error");
  });
});

describe("projections", () => {
  it("cost of sales at or above 100%", () => {
    expect(run({ projection: { materialCostPct: 105 } }).issues["projection.materialCostPct"]?.level).toBe("error");
  });

  it("a new loan needs a tenure", () => {
    expect(run({ projection: { newTermLoan: 500_000, loanTenureYears: 0 } }).issues["projection.loanTenureYears"]?.level).toBe("error");
  });

  it("loan applied for differs from the projected loan", () => {
    const result = run({ projection: { newTermLoan: 500_000, newFixedAssets: 700_000 }, details: { loanAmount: "600000" } });
    expect(result.issues["projection.newTermLoan"]?.message).toMatch(/Apply kiya loan Rs\. 6,00,000\.00 hai/);
  });

  it("a new business needs first-year sales", () => {
    expect(run({ hasActual: false }).issues["projection.year1Sales"]?.level).toBe("error");
    expect(run({ hasActual: false, projection: { year1Sales: 1_200_000 } }).issues["projection.year1Sales"]).toBeUndefined();
  });

  it("days above a year", () => {
    expect(run({ projection: { debtorDays: 400 } }).issues["projection.debtorDays"]?.level).toBe("error");
  });
});

describe("labels", () => {
  it("has a label for every field it can report", () => {
    expect(FIELD_ORDER.length).toBe(Object.keys(FIELD_LABELS).length);
    for (const key of Object.keys(emptyActual())) expect(FIELD_LABELS).toHaveProperty(`actual.${key}`);
    for (const key of Object.keys(defaultProjection())) expect(FIELD_LABELS).toHaveProperty(`projection.${key}`);
  });
});

describe("loan structure and schemes", () => {
  const project = { newFixedAssets: 800_000, workingCapitalNeed: 200_000, capitalIntroducedYear1: 100_000, newTermLoan: 720_000, ccLimit: 180_000 };

  it("is quiet when means of finance equal the project cost", () => {
    const result = run({ projection: { ...project, scheme: "pmegp", schemeArea: "rural", subsidyAmount: 250_000 } });
    expect(Object.keys(result.issues).filter((key) => key.startsWith("projection."))).toEqual([]);
  });

  it("flags a project the means of finance do not cover", () => {
    const issue = run({ projection: { ...project, newTermLoan: 600_000 } }).issues["projection.workingCapitalNeed"];
    expect(issue?.level).toBe("error");
    expect(issue?.message).toMatch(/Rs\. 1,20,000\.00 ka intezaam/);
  });

  it("does not treat the scheme choice as a broken number", () => {
    expect(run({ projection: { scheme: "cmyuva", schemeSector: "service" } }).issues["projection.scheme"]).toBeUndefined();
  });

  it("warns past a scheme's project cost and loan limits", () => {
    const big = { newFixedAssets: 6_000_000, workingCapitalNeed: 0, capitalIntroducedYear1: 600_000, newTermLoan: 5_400_000, ccLimit: 0 };
    expect(run({ projection: { ...big, scheme: "pmegp" } }).issues["projection.newFixedAssets"]?.message).toMatch(/PMEGP mein project cost Rs\. 50,00,000\.00 tak/);
    expect(run({ projection: { ...big, scheme: "mudra" } }).issues["projection.newTermLoan"]?.message).toMatch(/PM Mudra mein loan Rs\. 20,00,000\.00 tak/);
  });

  it("asks for both parts of a CM-YUVA composite loan", () => {
    const termOnly = { newFixedAssets: 400_000, workingCapitalNeed: 0, capitalIntroducedYear1: 40_000, newTermLoan: 360_000, ccLimit: 0 };
    expect(run({ projection: { ...termOnly, scheme: "cmyuva" } }).issues["projection.ccLimit"]?.message).toMatch(/composite loan/);
  });

  it("warns when own contribution is below the scheme's share, and subsidy above it", () => {
    const result = run({ projection: { ...project, capitalIntroducedYear1: 50_000, newTermLoan: 770_000, scheme: "pmegp", subsidyAmount: 400_000 } });
    expect(result.issues["projection.capitalIntroducedYear1"]?.message).toMatch(/10% \(Rs\. 1,00,000\.00\)/);
    expect(result.issues["projection.subsidyAmount"]?.message).toMatch(/zyada se zyada Rs\. 1,50,000\.00/);
  });

  it("compares the loan applied for with term loan + CC", () => {
    expect(run({ projection: project, details: { loanAmount: "1000000" } }).issues.loanAmount?.message).toMatch(/term loan \+ CC milakar Rs\. 9,00,000\.00/);
  });

  it("needs years for an interest subvention", () => {
    expect(run({ projection: { interestSubventionPct: 100, interestSubventionYears: 0 } }).issues["projection.interestSubventionYears"]?.level).toBe("error");
  });
});
