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
    expect(run({ actual: { rent: "60.000.00" } }).issues["actual.rent"]).toMatchObject({ level: "error", message: expect.stringMatching(/valid number/) });
  });
});

describe("balance sheet does not tally", () => {
  it("puts the error on cash and says what cash should be", () => {
    const issue = run({ actual: { cashAndBank: 140_000 } }).issues["actual.cashAndBank"];
    expect(issue?.level).toBe("error");
    expect(issue?.message).toMatch(/Liabilities .* are Rs\. 10,000\.00 more than assets/);
    expect(issue?.message).toMatch(/cash and bank should be Rs\. 1,50,000\.00/);
  });

  it("explains the other direction too", () => {
    const issue = run({ actual: { debtors: 260_000 } }).issues["actual.cashAndBank"];
    expect(issue?.message).toMatch(/Assets .* are Rs\. 10,000\.00 more than liabilities/);
    expect(issue?.message).toMatch(/should be Rs\. 1,40,000\.00/);
  });

  it("does not suggest a cash figure while another box is unreadable", () => {
    const message = run({ actual: { rent: "60.000.00" } }).issues["actual.cashAndBank"]?.message ?? "";
    expect(message).toMatch(/Rent is not a valid number and counts as 0/);
    expect(message).not.toMatch(/should be/);
  });

  it("says when even nil cash cannot close the gap", () => {
    expect(run({ actual: { debtors: 600_000 } }).issues["actual.cashAndBank"]?.message).toMatch(/Even nil cash/);
  });
});

describe("figures that cannot be right", () => {
  it("closing stock larger than everything available", () => {
    const issue = run({ actual: { closingStock: 2_000_000 } }).issues["actual.closingStock"];
    expect(issue).toMatchObject({ level: "error" });
    expect(issue?.message).toMatch(/Rs\. 18,00,000\.00/);
  });

  it("tax above the profit, and tax on a loss", () => {
    expect(run({ actual: { tax: 250_000, cashAndBank: 0 } }).issues["actual.tax"]?.message).toMatch(/more than the profit before tax \(Rs\. 2,00,000\.00\)/);
    expect(run({ actual: { sales: 1_000_000, tax: 1000 } }).issues["actual.tax"]?.message).toMatch(/no profit before tax/);
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
    expect(run({ actual: { interest: 0, otherExpenses: 50_000 } }).issues["actual.interest"]?.message).toMatch(/no interest/);
  });

  it("debtors above a year's sales", () => {
    expect(run({ actual: { sales: 200_000 } }).issues["actual.debtors"]?.level).toBe("warning");
  });
});

describe("customer details", () => {
  it("PAN and GSTIN format, and a GSTIN of a different PAN", () => {
    expect(run({ details: { pan: "ABCD1234F" } }).issues.pan?.level).toBe("error");
    expect(run({ details: { gstin: "09ABCDE1234F" } }).issues.gstin?.message).toMatch(/15 characters/);
    expect(run({ details: { gstin: "09PQRST6789K1Z5" } }).issues.gstin?.message).toMatch(/belongs to PAN PQRST6789K/);
  });

  it("mobile and pincode say what is wrong", () => {
    expect(run({ details: { mobile: "98765" } }).issues.mobile?.message).toMatch(/5 digits; it needs 10/);
    expect(run({ details: { mobile: "1234567890" } }).issues.mobile?.message).toMatch(/starts with 6, 7, 8 or 9/);
    expect(run({ details: { pincode: "28500" } }).issues.pincode?.message).toMatch(/needs 6/);
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
    expect(result.issues["projection.newTermLoan"]?.message).toMatch(/applied for is Rs\. 6,00,000\.00/);
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
