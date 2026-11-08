import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { loadPdfParse } from "@/lib/balance-sheets/pdf-text";

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
  it("renders every section of a bank DPR", async () => {
    const pdf = await renderProjectReportPdf(record());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.DPR_PDF_OUT) writeFileSync(process.env.DPR_PDF_OUT, pdf);
    const { text, pages } = await textOf(pdf);
    // No blank pages: the footer must not push content onto new pages.
    expect(pages).toBeGreaterThanOrEqual(6);
    expect(pages).toBeLessThanOrEqual(9);
    for (const heading of [
      "DETAILED PROJECT REPORT",
      "PROJECT AT A GLANCE",
      "INTRODUCTION",
      "PROMOTER PROFILE",
      "COST OF PROJECT",
      "MEANS OF FINANCE",
      "ASSESSMENT OF WORKING CAPITAL",
      "PROJECTED PROFITABILITY STATEMENT",
      "PROJECTED BALANCE SHEET",
      "DEPRECIATION SCHEDULE",
      "REPAYMENT SCHEDULE OF TERM LOAN",
      "DEBT SERVICE COVERAGE RATIO",
      "BREAK-EVEN ANALYSIS",
      "SWOT ANALYSIS",
      "DECLARATION",
    ]) {
      expect(text, heading).toContain(heading);
    }
    expect(text).toContain("Shree Ram Flour Mill");
    expect(text).toContain("PMEGP");
    expect(text).toContain("Atta chakki 20 HP with motor");
    expect(text).toContain("54,00,000.00");
    expect(text).toContain("not included in the cost of project");
  });

  it("uses the admin's own text for a section", async () => {
    const input = { ...sampleDpr(new Date("2026-11-08")), narrative: { market: "Mandi mein atte ki maang bahut hai." } };
    const { text } = await textOf(await renderProjectReportPdf(record({ input })));
    expect(text).toContain("Mandi mein atte ki maang bahut hai.");
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
    expect(text).toContain("Bank finance (no government scheme)");
    expect(text).toContain("Computer training");
  });
});
