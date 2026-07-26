import { describe, expect, it } from "vitest";

import { classifyItrComplexity, resolveItrCatalogPrice, requiredItrDocuments } from "@/lib/itr/pricing";
import { resolveItrServiceSlug, isItrServiceSlug, ITR_SERVICE_SLUG, ITR_SEO_ALIAS_SLUG } from "@/lib/itr/constants";

describe("ITR slug compatibility", () => {
  it("resolves SEO alias to canonical slug", () => {
    expect(resolveItrServiceSlug(ITR_SEO_ALIAS_SLUG)).toBe(ITR_SERVICE_SLUG);
    expect(resolveItrServiceSlug(ITR_SERVICE_SLUG)).toBe(ITR_SERVICE_SLUG);
    expect(isItrServiceSlug(ITR_SEO_ALIAS_SLUG)).toBe(true);
    expect(isItrServiceSlug("gst-registration")).toBe(false);
  });
});

describe("ITR complexity / pricing", () => {
  it("recommends basic for simple salary profile", () => {
    const result = classifyItrComplexity({ incomeSources: ["salary"], employerCount: 1 });
    expect(result.recommendedPlanKey).toBe("basic");
    expect(result.startingPrice).toBe(499);
    expect(result.isCustomQuote).toBe(false);
  });

  it("bumps to capital gains for shares", () => {
    const result = classifyItrComplexity({ incomeSources: ["salary", "shares"] });
    expect(result.recommendedPlanKey).toBe("capital_gains");
    expect(result.startingPrice).toBe(1999);
  });

  it("marks crypto as complex custom quote", () => {
    const result = classifyItrComplexity({ incomeSources: ["crypto"], hasCrypto: true });
    expect(result.recommendedPlanKey).toBe("complex");
    expect(result.isCustomQuote).toBe(true);
  });

  it("resolves catalog price server-side", () => {
    expect(resolveItrCatalogPrice("basic")).toBe(499);
    expect(resolveItrCatalogPrice("professional")).toBe(999);
    expect(resolveItrCatalogPrice("complex")).toBe(0);
    expect(resolveItrCatalogPrice("unknown")).toBe(499);
  });

  it("computes required documents by income sources", () => {
    const docs = requiredItrDocuments({
      incomeSources: ["salary", "shares"],
      profile: "salaried",
      documents: [
        { documentKey: "pan", documentLabel: "PAN", taxpayerProfiles: [], incomeSources: [], requiredDefault: true },
        { documentKey: "form16", documentLabel: "Form 16", taxpayerProfiles: ["salaried"], incomeSources: ["salary"], requiredDefault: false },
        { documentKey: "broker_statement", documentLabel: "Broker", taxpayerProfiles: ["investor"], incomeSources: ["shares"], requiredDefault: false },
        { documentKey: "pl_summary", documentLabel: "P&L", taxpayerProfiles: ["business"], incomeSources: ["business"], requiredDefault: false },
      ],
    });
    const keys = docs.map((d) => d.documentKey);
    expect(keys).toContain("pan");
    expect(keys).toContain("form16");
    expect(keys).toContain("broker_statement");
    expect(keys).not.toContain("pl_summary");
  });
});
