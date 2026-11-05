import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { FIELD_LABELS } from "@/lib/balance-sheets/checks";
import { FIELD_GUIDE, IMPORTANCE_LABEL } from "@/lib/balance-sheets/field-guide";

describe("field guide", () => {
  it("explains every field the checks know about", () => {
    const missing = Object.keys(FIELD_LABELS).filter((key) => !(key in FIELD_GUIDE));
    expect(missing).toEqual([]);
  });

  it("answers what, where and why for every entry, with a known importance", () => {
    for (const [key, guide] of Object.entries(FIELD_GUIDE)) {
      for (const part of [guide.what, guide.where, guide.why]) expect(part.trim().length, key).toBeGreaterThan(10);
      expect(IMPORTANCE_LABEL).toHaveProperty(guide.importance);
    }
  });

  it("marks the boxes a sheet cannot be made without as required", () => {
    for (const key of ["businessName", "ownerName", "actual.sales", "actual.purchases", "actual.closingStock", "actual.openingCapital", "actual.cashAndBank"] as const) {
      expect(FIELD_GUIDE[key].importance, key).toBe("required");
    }
  });

  it("is wired to every box in the form", () => {
    const form = readFileSync(join(process.cwd(), "src/components/admin/balance-sheet-form.tsx"), "utf8");
    const used = new Set([...form.matchAll(/\b(?:field|guide)="([A-Za-z0-9.]+)"/g)].map((m) => m[1]));
    const unused = Object.keys(FIELD_GUIDE).filter((key) => !used.has(key) && key !== "projection.otherIncomePerYear");
    expect(unused).toEqual([]);
  });
});
