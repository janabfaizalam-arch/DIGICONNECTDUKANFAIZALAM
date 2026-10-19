import { describe, expect, it } from "vitest";

import {
  LAUNCH_MODULES,
  PRESETS,
  STRUCTURES,
  moduleById,
  presetModules,
  resolveLaunchModules,
  summariseSelection,
  type CatalogueEntry,
  type CheckoutEntry,
} from "@/lib/homepage/launch-catalog";
import { readCode } from "@/lib/testing/source";

const catalogue: CatalogueEntry[] = [
  { slug: "gst-registration", title: "GST Registration", shortDescription: "", priceLabel: "Rs 999", amount: 999 },
  { slug: "msme-certificate", title: "MSME Certificate", shortDescription: "", priceLabel: "Rs 499", amount: 499 },
  { slug: "private-limited-registration", title: "Private Limited Registration", shortDescription: "", priceLabel: "Enquiry Now", amount: 0 },
];

const checkout: CheckoutEntry[] = [
  { slug: "gst-registration", title: "GST Registration", fee: 1099, governmentFeeType: "not_applicable", governmentFeeAmount: 0, processingTime: "3–5 days" },
  { slug: "trademark-filing", title: "Trademark", fee: 0, governmentFeeType: "extra", governmentFeeAmount: 4500, processingTime: null },
];

describe("resolving launch modules against the catalogue", () => {
  const resolved = resolveLaunchModules(catalogue, checkout, { "msme-certificate": "1–2 days" });

  it("prices a module only from what checkout charges", () => {
    expect(resolved.gst.availability).toBe("checkout");
    // The checkout fee wins over the directory's listed amount.
    expect(resolved.gst.fee).toBe(1099);
    expect(resolved.gst.timeline).toBe("3–5 days");
  });

  it("lists a catalogue service that checkout cannot sell, without inventing a fee", () => {
    expect(resolved.msme.availability).toBe("listed");
    expect(resolved.msme.fee).toBeNull();
    expect(resolved.msme.priceLabel).toBe("Rs 499");
    expect(resolved.msme.href).toBe("/services/msme-certificate");
    expect(resolved.msme.timeline).toBe("1–2 days");
  });

  it("does not show a price label for an unpriced listing", () => {
    expect(resolved["incorporation-pvt"].availability).toBe("listed");
    expect(resolved["incorporation-pvt"].priceLabel).toBeNull();
  });

  it("treats a zero checkout fee as not sellable online", () => {
    expect(resolved.trademark.availability).toBe("enquiry");
    expect(resolved.trademark.fee).toBeNull();
  });

  it("falls back to enquiry for modules nobody has configured", () => {
    expect(resolved["incorporation-llp"].availability).toBe("enquiry");
    expect(resolved["incorporation-llp"].href).toBeNull();
  });

  it("totals only the online fees and keeps quoted items separate", () => {
    const summary = summariseSelection(["gst", "msme", "incorporation-llp"], resolved);
    expect(summary.onlineTotal).toBe(1099);
    expect(summary.online.map((line) => line.mod.id)).toEqual(["gst"]);
    expect(summary.quoted.map((line) => line.mod.id)).toEqual(["msme", "incorporation-llp"]);
  });
});

describe("catalogue rules", () => {
  it("gives every structure a foundation module that applies to it", () => {
    for (const structure of STRUCTURES) {
      const mod = moduleById(structure.foundationModule);
      expect(mod?.appliesTo).toContain(structure.id);
    }
  });

  it("drops modules a structure cannot use from a preset", () => {
    const premium = PRESETS.find((preset) => preset.id === "launch-complete")!;
    const forProprietor = presetModules(premium, "proprietorship");
    expect(forProprietor[0]).toBe("incorporation-proprietorship");
    expect(forProprietor).not.toContain("dsc");
    expect(forProprietor).not.toContain("annual-compliance");
  });

  it("keeps module ids unique", () => {
    const ids = LAUNCH_MODULES.map((mod) => mod.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never hardcodes a rupee amount in the launch catalogue", () => {
    const source = readCode("src/lib/homepage/launch-catalog.ts");
    expect(source).not.toMatch(/₹\s?\d|Rs\.?\s?\d|price:\s*\d/);
  });
});
