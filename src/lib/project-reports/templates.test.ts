import { describe, expect, it } from "vitest";

import { draftNarrative, emptyDpr } from "./defaults";
import { buildDpr, type DprInput } from "./engine";
import { dprInputSchema } from "./schema";
import { applyTemplate, TEMPLATES } from "./templates";

const total = (input: DprInput) => buildDpr(input).cost.total;

function quick(templateId: string, projectCost: number): DprInput {
  const base = { ...emptyDpr(new Date("2026-11-08")), businessName: "Test Unit", scheme: "none" as const, promoters: [{ ...emptyDpr().promoters[0], name: "Asha Devi", qualification: "Graduate", experience: "5 years in the trade" }] };
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
        expect(report.errors, detail).toEqual([]);
        // Quotations are the customer's to furnish; every other warning would be a modelling gap.
        expect(report.warnings.filter((w) => !/quotation/i.test(w)), detail).toEqual([]);
        expect(Object.values(report.checks).every(Boolean), detail).toBe(true);
        expect(report.averageDscr!, detail).toBeGreaterThanOrEqual(1.5);
        expect(report.minimumDscr!, detail).toBeGreaterThanOrEqual(1.2);
        // Much higher reads as inflated to a credit officer.
        expect(report.averageDscr!, detail).toBeLessThanOrEqual(4);
        expect(dprInputSchema.safeParse(input).success).toBe(true);
      });
    }
  }

  /**
   * The combined mill a PMFME file in this district actually describes: one
   * unit pressing oil, milling wheat and millets and grinding besan, running
   * on rooftop solar. Picking "oil-mill" or "flour-mill" for it would put two
   * products in the sales table where the business sells five, and every
   * statement built on that table would describe a different business.
   */
  describe("oil + flour mill", () => {
    const input = quick("oil-flour-mill", 1000000);

    it("sells all five products the unit actually makes", () => {
      expect(input.products.map((p) => p.name)).toEqual([
        "Kachi ghani mustard oil",
        "Mustard oil cake (khali)",
        "Wheat flour (atta)",
        "Besan",
        "Millet flour (shree anna)",
      ]);
    });

    it("buys the four grains those products are made from", () => {
      expect(input.rawMaterials.map((m) => m.name)).toEqual([
        "Mustard seed (sarso)",
        "Wheat",
        "Gram (chana)",
        "Millets (raw)",
      ]);
    });

    it("carries the solar system in the machinery, not just in the write-up", () => {
      // "with solar" on the cover has to be a line a bank can match against a
      // quotation, not a sentence in the market section.
      const solar = input.capitalItems.filter((i) => /solar/i.test(i.description));
      expect(solar).toHaveLength(1);
      expect(solar[0].kind).toBe("machinery");
      expect(solar[0].rate).toBeGreaterThan(0);
    });

    it("is offered to PMFME, which funds food processing only", () => {
      const template = TEMPLATES.find((t) => t.id === "oil-flour-mill")!;
      expect(template.group).toBe("food");
      expect(template.notFor).not.toContain("pmfme");
    });
  });

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
