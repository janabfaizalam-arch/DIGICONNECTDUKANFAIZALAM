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
    expect(pages).toBeGreaterThanOrEqual(20);
    expect(pages).toBeLessThanOrEqual(34);
    // The 28 sections a bank expects, in the report's own words.
    for (const heading of [
      "DETAILED PROJECT REPORT",
      "Table of Contents",
      "Executive Summary",
      "Internal consistency checks",
      "Project at a Glance",
      "Promoter Profile",
      "Scheme Eligibility — PMEGP",
      "Scheme rules used and their verification status",
      "Project Profile",
      "Market Analysis",
      "Manufacturing / Service Process",
      "Machinery and Equipment",
      "Production, Sales and Raw Material",
      "Production and saleable quantity",
      "Statutory Compliance and Licences",
      "Mandatory approvals",
      "Project Cost",
      "Means of Finance",
      "Treatment of the government subsidy",
      "Working Capital Assessment",
      "Employees and Salary",
      "Loan Repayment Schedule",
      "Depreciation Schedule",
      "Projected Profit and Loss",
      "Computation of income tax",
      "Projected Balance Sheet",
      "Cash Flow Statement",
      "Operating activities",
      "Investing activities",
      "Financing activities",
      "DSCR, Current Ratio and Key Ratios",
      "Break-even Analysis",
      "Sensitivity Analysis",
      "Risk Analysis and SWOT",
      "Implementation Schedule",
      "Conclusion and Declaration",
      "Month-wise Repayment Schedule",
      "Basis of Projections",
      "Assumptions to be Confirmed and Data Gaps",
      "Documents Checklist",
      "EDP (Entrepreneurship Development Programme) training certificate",
      "Quotation pending",
      "not a CA certification",
    ]) {
      expect(text.toLowerCase(), heading).toContain(heading.toLowerCase());
    }
    expect(text).not.toContain("NOT RECONCILED");
    expect(text).toContain("Shree Ram Flour Mill");
    expect(text).toContain("PMEGP");
    expect(text).toContain("Atta chakki 20 HP with motor");
    expect(text).toContain("54.00"); // year I sales, Rs. lakh
    expect(text).toContain("Wheat flour (atta) (quintal) 3,000 1,800"); // capacity and year-I production
    expect(text).toContain("not included in the cost of project");
    expect(text).toContain("Amount in Rs. lakh");
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
