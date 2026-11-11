import { describe, expect, it } from "vitest";

import { emptyDpr } from "./defaults";
import { eligibilityIssues, isEligible, templatesFor } from "./eligibility";
import { GROUP_LABELS } from "./activities";
import { TEMPLATES, templateById } from "./templates";

const ids = (scheme: Parameters<typeof templatesFor>[0], sector: Parameters<typeof templatesFor>[1] = "all") =>
  templatesFor(scheme, sector).flatMap((g) => g.templates.map((t) => t.id));

describe("which businesses each scheme offers", () => {
  it("offers a wide list: manufacturing, service and trading", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(60);
    for (const sector of ["manufacturing", "service", "trading"] as const) expect(TEMPLATES.filter((t) => t.sector === sector).length, sector).toBeGreaterThanOrEqual(9);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) expect(GROUP_LABELS[t.group], t.id).toBeTruthy();
  });

  it("keeps trading out of PMEGP and MYSY, and lets CM-YUVA and Mudra have it", () => {
    for (const scheme of ["pmegp", "mysy"] as const) {
      expect(ids(scheme).some((id) => templateById(id)?.sector === "trading"), scheme).toBe(false);
      expect(ids(scheme, "trading"), scheme).toEqual([]);
    }
    for (const scheme of ["cmyuva", "mudra", "none"] as const) {
      expect(ids(scheme), scheme).toContain("kirana");
      expect(ids(scheme), scheme).toContain("medical-store");
    }
  });

  it("lists packaged drinking water for MYSY and PMEGP", () => {
    expect(ids("mysy", "manufacturing")).toContain("packaged-water");
    expect(ids("pmegp")).toContain("packaged-water");
  });

  it("respects an activity's own exclusions", () => {
    const rickshaw = templateById("e-rickshaw")!;
    expect(isEligible(rickshaw, "pmegp")).toBe(false);
    expect(isEligible(rickshaw, "cmyuva")).toBe(true);
    expect(ids("pmegp")).not.toContain("e-rickshaw");
  });

  it("groups the list under readable headings, each business once", () => {
    const groups = templatesFor("cmyuva");
    expect(groups.length).toBeGreaterThanOrEqual(8);
    const all = groups.flatMap((g) => g.templates.map((t) => t.id));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("eligibility warnings", () => {
  const base = { ...emptyDpr(new Date("2026-11-08")), promoters: [{ ...emptyDpr().promoters[0], name: "Ravi", age: 30 }] };

  it("is quiet for a project that fits", () => {
    expect(eligibilityIssues({ ...base, scheme: "pmegp", sector: "manufacturing", templateId: "papad" })).toEqual([]);
  });

  it("flags trading under PMEGP", () => {
    expect(eligibilityIssues({ ...base, scheme: "pmegp", sector: "trading", templateId: "kirana" }).join(" ")).toContain("PMEGP mein trading");
  });

  it("flags an excluded activity", () => {
    expect(eligibilityIssues({ ...base, scheme: "pmegp", sector: "service", templateId: "e-rickshaw" }).join(" ")).toContain("PMEGP mein nahi aata");
  });

  it("flags the promoter's age against the scheme's limits", () => {
    const old = { ...base, promoters: [{ ...base.promoters[0], age: 45 }] };
    expect(eligibilityIssues({ ...old, scheme: "cmyuva" }).join(" ")).toContain("40 saal tak");
    expect(eligibilityIssues({ ...old, scheme: "pmegp" })).toEqual([]);
    const young = { ...base, promoters: [{ ...base.promoters[0], age: 19 }] };
    expect(eligibilityIssues({ ...young, scheme: "cmyuva" }).join(" ")).toContain("kam se kam 21");
  });
});
