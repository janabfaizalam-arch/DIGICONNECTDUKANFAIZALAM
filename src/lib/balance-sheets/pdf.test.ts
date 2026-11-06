import { describe, expect, it } from "vitest";

import { defaultProjection, emptyActual } from "@/lib/balance-sheets/engine";
import { renderBalanceSheetPdf } from "@/lib/balance-sheets/pdf";
import type { BalanceSheetRecord } from "@/lib/balance-sheets/store";

export function sampleRecord(overrides: Partial<BalanceSheetRecord> = {}): BalanceSheetRecord {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    reference: "DIGI-BS-00001",
    businessName: "Shree Ganesh Traders",
    ownerName: "Ramesh Kumar",
    constitution: "proprietorship",
    natureOfBusiness: "Wholesale trading of grocery items",
    pan: "ABCDE1234F",
    gstin: null,
    udyamNumber: null,
    address: "Station Road",
    city: "Orai",
    state: "Uttar Pradesh",
    pincode: "285001",
    mobile: "9876543210",
    email: null,
    bankName: "State Bank of India, Orai Branch",
    loanPurpose: "Working capital and purchase of machinery",
    loanAmount: 500000,
    baseYear: 2025,
    hasActual: true,
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
      openingCapital: 500_000,
      drawings: 100_000,
      termLoan: 200_000,
      creditors: 150_000,
      otherCurrentLiabilities: 50_000,
      fixedAssets: 300_000,
      debtors: 250_000,
      cashAndBank: 150_000,
    },
    projection: { ...defaultProjection(), years: 5, newTermLoan: 500_000, newFixedAssets: 400_000, drawingsPerYear: 120_000 },
    status: "draft",
    createdAt: "2026-11-05T00:00:00Z",
    updatedAt: "2026-11-05T00:00:00Z",
    ...overrides,
  };
}

describe("balance sheet PDF", () => {
  const pages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

  it("adds a project cost page when there is a new project: six pages", async () => {
    const pdf = await renderBalanceSheetPdf(sampleRecord());
    expect(pdf.toString("latin1").startsWith("%PDF")).toBe(true);
    expect(pages(pdf)).toBe(6);
  });

  it("keeps five pages without a new project: cover, P&L, balance sheet, ratios, notes", async () => {
    const pdf = await renderBalanceSheetPdf(
      sampleRecord({ projection: { ...defaultProjection(), years: 5, drawingsPerYear: 120_000 } }),
    );
    expect(pages(pdf)).toBe(5);
  });

  it("renders a PMEGP composite loan with subsidy and interest subvention", async () => {
    const pdf = await renderBalanceSheetPdf(
      sampleRecord({
        projection: {
          ...defaultProjection(),
          years: 5,
          scheme: "pmegp",
          schemeArea: "rural",
          newFixedAssets: 800_000,
          workingCapitalNeed: 200_000,
          capitalIntroducedYear1: 100_000,
          newTermLoan: 720_000,
          ccLimit: 180_000,
          subsidyAmount: 250_000,
          interestSubventionPct: 50,
          interestSubventionYears: 3,
        },
      }),
    );
    expect(pages(pdf)).toBe(6);
  });

  it("renders a new business with no actual year", async () => {
    const pdf = await renderBalanceSheetPdf(
      sampleRecord({
        hasActual: false,
        actual: emptyActual(),
        projection: { ...defaultProjection(), years: 3, year1Sales: 1_200_000, materialCostPct: 65, indirectExpensesYear1: 180_000, capitalIntroducedYear1: 200_000, newFixedAssets: 600_000, newTermLoan: 500_000 },
      }),
    );
    expect(pdf.length).toBeGreaterThan(5000);
  });
});
