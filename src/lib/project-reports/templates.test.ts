import { describe, expect, it } from "vitest";

import { draftNarrative, emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import { dprInputSchema } from "./schema";
import { applyTemplate, TEMPLATES } from "./templates";

const total = (input: DprInput) => buildDpr(input).cost.total;

function quick(templateId: string, projectCost: number): DprInput {
  const base = { ...emptyDpr(new Date("2026-11-08")), businessName: "Test Unit", scheme: "none" as const, promoters: [{ ...emptyDpr().promoters[0], name: "Asha Devi" }] };
  return applyTemplate(base, templateId, projectCost, total);
}

describe("project templates", () => {
  for (const template of TEMPLATES) {
    for (const cost of [500000, 1000000, 2500000]) {
      it(`${template.id} at Rs. ${cost / 100000} lakh is sized right and viable`, () => {
        const input = quick(template.id, cost);
        const report = buildDpr(input);
        const detail = `DSCR ${report.averageDscr} min ${report.minimumDscr}; ${report.warnings.join(" | ")}`;
        expect(Math.abs(report.cost.total - cost) / cost, detail).toBeLessThan(0.01);
        expect(report.warnings, detail).toEqual([]);
        expect(report.averageDscr!, detail).toBeGreaterThanOrEqual(1.5);
        expect(report.minimumDscr!, detail).toBeGreaterThanOrEqual(1.2);
        expect(dprInputSchema.safeParse(input).success).toBe(true);
      });
    }
  }

  it("keeps the business and promoter already typed", () => {
    const input = quick("dairy", 1000000);
    expect(input.businessName).toBe("Test Unit");
    expect(input.promoters[0].name).toBe("Asha Devi");
    expect(input.templateId).toBe("dairy");
  });

  it("writes the trade's own market text into the report", () => {
    const text = draftNarrative(quick("oil-mill", 1000000));
    expect(text.market).toContain("Mustard oil");
    expect(text.licences).toContain("FSSAI");
    expect(text.summary).toContain("Test Unit");
  });
});
