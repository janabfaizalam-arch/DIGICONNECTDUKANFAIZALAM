import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { loadPdfParse } from "@/lib/balance-sheets/pdf-text";

import { buildDpr } from "./engine";
import { renderProjectReportPdf } from "./pdf";
import { sampleDpr } from "./sample";
import type { ProjectReportRecord } from "./store";

function record(overrides: Partial<ProjectReportRecord> = {}): ProjectReportRecord {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    reference: "DIGI-DPR-00001",
    status: "draft",
    input: sampleDpr(new Date("2026-11-08")),
    createdAt: "2026-11-08T00:00:00Z",
    updatedAt: "2026-11-08T00:00:00Z",
    ...overrides,
  };
}

async function textOf(pdf: Buffer) {
  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  const result = await parser.getText();
  await parser.destroy();
  return { text: result.text.replace(/\s+/g, " "), pages: result.pages?.length ?? result.total ?? 0 };
}

describe("DPR PDF", () => {
  it("renders the ten statements of the bank format and nothing else", async () => {
    const pdf = await renderProjectReportPdf(record());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.DPR_PDF_OUT) writeFileSync(process.env.DPR_PDF_OUT, pdf);
    const { text, pages } = await textOf(pdf);
    expect(pages).toBeGreaterThanOrEqual(10);
    expect(pages).toBeLessThanOrEqual(12);
    for (const heading of [
      "PROJECT AT A GLANCE",
      "Name of the Concern",
      "Capital Composition",
      "Technical Know-how",
      "D.S.C.R.",
      "COST OF PROJECT",
      "MEANS OF FINANCE",
      "TERM LOAN REPAYMENT SCHEDULE",
      "CALCULATION OF DEPRECIATION OF FIXED ASSETS",
      "CALCULATION OF ESTIMATED SALARY",
      "COST OF PRODUCTION AND PROFITABILITY STATEMENTS YEAR 1",
      "To Opening Stock",
      "By Closing Stock",
      "TOTAL RUPEES",
      "[B] EXPENDITURE",
      "Cash Accruals",
      "PROJECTED BALANCE SHEET",
      "Total Liabilities",
      "Total Assets",
      "CASH FLOW STATEMENT",
      "A. SOURCES OF FUNDS",
      "B. USES OF FUNDS",
      "CALCULATION OF CURRENT RATIO",
      "Average CURRENT RATIO",
      "CALCULATION OF DEBT SERVICE COVERAGE RATIO",
      "Average Debt Service Coverage Ratio",
    ]) {
      expect(text, heading).toContain(heading);
    }
    // Everything outside the bank format is gone.
    for (const removed of ["Table of Contents", "Executive Summary", "Market Analysis", "Sensitivity Analysis", "Documents Checklist", "Break-even"]) {
      expect(text).not.toContain(removed);
    }
    expect(text).toContain("SHREE RAM FLOUR MILL");
    expect(text).toContain("PMEGP");
  });

  it("ties the profitability statement to the engine's profit", async () => {
    const input = sampleDpr(new Date("2026-11-08"));
    const report = buildDpr(input);
    const { text } = await textOf(await renderProjectReportPdf(record({ input })));
    const lakh = (v: number) => (Math.round(v / 1000) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    expect(text).toContain(lakh(report.years[0].profitBeforeTax));
    expect(text).toContain(lakh(report.years[0].cashAccrual));
    expect(text).toContain(lakh(report.cost.total));
  });

  it("renders a service project with no raw material and no scheme", async () => {
    const input = {
      ...sampleDpr(new Date("2026-11-08")),
      scheme: "none" as const,
      sector: "service" as const,
      rawMaterials: [],
      products: [{ name: "Computer training", unit: "student", capacity: 400, price: 6000 }],
      capitalItems: [{ kind: "computer" as const, description: "Computers", quantity: 10, rate: 35000 }],
    };
    const pdf = await renderProjectReportPdf(record({ input }));
    const { text } = await textOf(pdf);
    expect(text).toContain("BANK FINANCE");
    expect(text).toContain("COMPUTER TRAINING");
  });
});
