import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { DPR_GUIDE, IMPORTANCE_LABEL } from "./field-guide";

const form = readFileSync(join(process.cwd(), "src/components/admin/project-report-form.tsx"), "utf8");

describe("DPR field guide", () => {
  it("answers what, where and why for every box, with a known importance", () => {
    for (const [key, guide] of Object.entries(DPR_GUIDE)) {
      for (const part of [guide.what, guide.where, guide.why]) expect(part.trim().length, key).toBeGreaterThan(10);
      expect(IMPORTANCE_LABEL, key).toHaveProperty(guide.importance);
    }
  });

  it("marks the quick DPR's must-have boxes as required", () => {
    for (const key of ["scheme", "templateId", "projectCost", "promoterName", "district"] as const) {
      expect(DPR_GUIDE[key].importance, key).toBe("required");
    }
  });

  it("is wired to the form, and every guide in the form exists", () => {
    const used = new Set([...form.matchAll(/\bguide="([A-Za-z]+)"/g)].map((m) => m[1]));
    expect([...used].filter((key) => !(key in DPR_GUIDE))).toEqual([]);
    // The basic form asks only the points of the bank's "Project at a Glance".
    for (const key of ["promoterName", "fatherName", "mobile", "businessName", "constitution", "address", "district", "scheme", "templateId", "projectCost", "ownContributionPct", "ccLimitOverride", "termLoanInterestPct", "tenureYears"]) {
      expect(used.has(key), key).toBe(true);
    }
  });
});
