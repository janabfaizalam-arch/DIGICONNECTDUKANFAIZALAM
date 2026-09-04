import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

import { PHOTO_SIZES, PAPER_SIZES, gridPlan } from "@/lib/print/sheet-layout";
import {
  SMART_PRINT_SERVICES,
  settingsFor,
  smartPrintService,
  type SmartPrintSettings,
} from "@/lib/print/smart-print";
import { baseRate, priceMatches, quote } from "@/lib/print/smart-pricing";
import { DEFAULT_RATES } from "@/lib/print/stations";

const RATES = DEFAULT_RATES; // A4 ₹2 mono / ₹10 colour, A3 ₹5 / ₹20

function settings(overrides: Partial<SmartPrintSettings> = {}): SmartPrintSettings {
  return {
    paper: "A4",
    color: "mono",
    finish: "normal",
    quality: "standard",
    copies: 1,
    ...overrides,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   The price comes from the shop's own rates
   ───────────────────────────────────────────────────────────────────────── */

describe("what a sheet costs", () => {
  it("uses the partner's rate, not ours", () => {
    const shop = { a4_mono: 3, a4_color: 12, a3_mono: 7, a3_color: 25 };
    expect(baseRate(shop, settings())).toBe(3);
    expect(baseRate(shop, settings({ color: "color" }))).toBe(12);
    expect(baseRate(shop, settings({ paper: "A3" }))).toBe(7);
    expect(baseRate(shop, settings({ paper: "A3", color: "color" }))).toBe(25);
  });

  it("charges a plain black and white A4 exactly the A4 rate", () => {
    expect(quote(RATES, settings(), 1).total).toBe(2);
  });

  it("multiplies for glossy paper and better ink, and says so in the breakdown", () => {
    const glossy = quote(RATES, settings({ color: "color", finish: "glossy", quality: "high" }), 1);
    // ₹10 × 2.5 × 1.4 = ₹35
    expect(glossy.total).toBe(35);
    expect(glossy.lines.map((line) => line.label)).toEqual([
      "A4 · Colour",
      "Glossy paper",
      "High quality",
    ]);
  });

  it("leaves the breakdown to one line when nothing is added", () => {
    expect(quote(RATES, settings(), 3).lines).toHaveLength(1);
  });

  it("multiplies by sheets and then by copies", () => {
    expect(quote(RATES, settings(), 4).total).toBe(8);
    expect(quote(RATES, settings({ copies: 3 }), 4).total).toBe(24);
  });

  it("never charges less than a rupee", () => {
    const cheap = { a4_mono: 0.2, a4_color: 0.2, a3_mono: 0.2, a3_color: 0.2 };
    expect(quote(cheap, settings(), 1).total).toBe(1);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Twelve passport photos, end to end
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The example from the brief, priced the way a shop would: one A4 of glossy
 * photo paper at high quality, whatever the customer chose the count to be,
 * because they all come off the same sheet.
 */
describe("the passport photo example", () => {
  const passport = smartPrintService("passport_photo");

  it("is one sheet whether the customer asks for six or twelve", () => {
    const six = gridPlan(PAPER_SIZES.A4, PHOTO_SIZES["35x45"], 6);
    const twelve = gridPlan(PAPER_SIZES.A4, PHOTO_SIZES["35x45"], 12);
    expect(six.sheets).toBe(1);
    expect(twelve.sheets).toBe(1);

    const config = settingsFor(passport!);
    expect(quote(RATES, config, six.sheets).total).toBe(quote(RATES, config, twelve.sheets).total);
  });

  it("prices the preset at the shop's colour rate times glossy times high", () => {
    const config = settingsFor(passport!);
    expect(config.photoCount).toBe(12);
    expect(config.finish).toBe("glossy");
    // ₹10 × 2.5 × 1.4 = ₹35 for the sheet.
    expect(quote(RATES, config, 1).total).toBe(35);
  });

  it("charges a second sheet when the customer wants thirty-six", () => {
    const plan = gridPlan(PAPER_SIZES.A4, PHOTO_SIZES["35x45"], 36);
    expect(plan.sheets).toBe(2);
    expect(quote(RATES, settingsFor(passport!), plan.sheets).total).toBe(70);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   A price a browser sends is a number a browser can edit
   ───────────────────────────────────────────────────────────────────────── */

describe("checking the client's figure", () => {
  it("accepts the same number and a rupee of rounding", () => {
    expect(priceMatches(35, 35)).toBe(true);
    expect(priceMatches(35, 34)).toBe(true);
    expect(priceMatches(35, 36)).toBe(true);
  });

  it("refuses a figure somebody typed", () => {
    expect(priceMatches(35, 1)).toBe(false);
    expect(priceMatches(35, 0)).toBe(false);
    expect(priceMatches(35, -35)).toBe(false);
    expect(priceMatches(35, "free")).toBe(false);
    expect(priceMatches(35, null)).toBe(false);
    expect(priceMatches(35, undefined)).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The catalogue itself
   ───────────────────────────────────────────────────────────────────────── */

describe("the services a counter offers", () => {
  it("offers three, because a counter sells three things", () => {
    /*
      It offered ten for a while — "form", "certificate", "photo print",
      "photos to PDF" — and every one of those was a document or a photograph
      wearing a different hat. Ten cards on a phone is not ten times the
      choice; it is a customer reading labels to work out which of four
      identical doors to go through.
    */
    expect(SMART_PRINT_SERVICES.map((service) => service.id)).toEqual([
      "id_copy",
      "passport_photo",
      "document",
    ]);
  });

  it("keeps no second door to the same room", () => {
    // Two services that upload one file and print it as it is are one service.
    const passthrough = SMART_PRINT_SERVICES.filter((service) => !service.composes);
    expect(passthrough).toHaveLength(1);
    expect(passthrough[0].id).toBe("document");
  });

  it("gives every service a preset that prices without any customer input", () => {
    for (const service of SMART_PRINT_SERVICES) {
      const config = settingsFor(service);
      const priced = quote(RATES, config, 1);
      expect(priced.total, `${service.id} could not be priced`).toBeGreaterThan(0);
    }
  });

  it("asks a document nothing it does not need", () => {
    // A4, black and white, one side. Every extra question is a chance to get
    // it wrong, so the rest waits for the shop to ask for it.
    const document = smartPrintService("document");
    expect(document?.always).toEqual(["copies", "color"]);
    expect(document?.preset.paper).toBe("A4");
    expect(document?.preset.color).toBe("mono");
    expect(document?.preset.quality).toBe("standard");
  });

  it("lets a shop override only what it cares about", () => {
    const passport = smartPrintService("passport_photo")!;
    const shop = settingsFor(passport, { passport_photo: { photoCount: 8 } });
    expect(shop.photoCount).toBe(8);
    // Untouched by the shop, so still ours.
    expect(shop.finish).toBe("glossy");
    expect(shop.quality).toBe("high");
  });

  it("never asks for something it cannot use", () => {
    /*
      Every question a service asks must have somewhere to put the answer.

      "pageRange" is the one question whose default is genuinely nothing —
      empty means all pages, which is what a customer wants nine times in ten
      — so it is allowed to be absent rather than given a fake default.
    */
    const alwaysPresent = ["paper", "color", "finish", "quality", "copies"];
    const emptyByDesign = ["pageRange"];

    for (const service of SMART_PRINT_SERVICES) {
      for (const ask of service.asks) {
        expect(
          Object.prototype.hasOwnProperty.call(service.preset, ask) ||
            alwaysPresent.includes(ask) ||
            emptyByDesign.includes(ask),
          `${service.id} asks for ${ask} but has no default for it`,
        ).toBe(true);
      }
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   A document is never "improved"
   ───────────────────────────────────────────────────────────────────────── */

/**
 * "Never alter the actual document information." An Aadhaar card with the
 * contrast pushed up is a card an office can refuse, and a customer offered a
 * brightness slider on one will use it. So the retouch tools appear on
 * photographs and nowhere else — asserted here rather than left to whoever
 * next edits the flow.
 */
describe("what may be retouched", () => {
  const flow = readCode("src/components/print/smart-print-flow.tsx");

  it("offers the tools on photographs only", () => {
    const retouchable = SMART_PRINT_SERVICES.filter((service) => service.retouch).map((s) => s.id);
    expect(retouchable).toEqual(["passport_photo"]);
  });

  it("offers them on no document service", () => {
    for (const id of ["id_copy", "document"]) {
      const service = smartPrintService(id);
      expect(service?.retouch, `${id} may be retouched`).toBeFalsy();
    }
  });

  it("gates the editor on that flag rather than on whether a sheet is composed", () => {
    // It used to be `service.composes`, which is true for the Aadhaar copy.
    expect(flow).toContain("service.retouch && slots.some(Boolean)");
    expect(flow).not.toContain("service.composes && slots.some(Boolean)");
  });

  it("changes only what is behind a face, never the face", () => {
    /*
      The backdrop is offered on the passport photo, and a filter with it. What
      is deliberately not offered anywhere is anything that reshapes a person:
      a passport photograph that no longer matches the person holding it is a
      rejected application, and that cost lands on the customer.
    */
    const passport = smartPrintService("passport_photo")!;
    expect(passport.asks).toContain("backdrop");
    expect(passport.always).toContain("backdrop");

    const portrait = readCode("src/lib/print/portrait.ts");
    expect(portrait).toContain("export async function replaceBackground");
    for (const forbidden of ["reshape", "faceSlim", "beautify", "smoothSkin", "clothing"]) {
      expect(portrait, `portrait.ts exports ${forbidden}`).not.toContain(`export function ${forbidden}`);
    }
  });

  it("never sends the photograph anywhere to be looked at", () => {
    // The whole reason for shipping an 11 MB runtime rather than calling an
    // API: somebody's face is not ours to upload to a third party.
    const portrait = readCode("src/lib/print/portrait.ts");
    expect(portrait).toContain('const WASM_PATH = "/mediapipe"');
    expect(portrait).toContain('const MODEL_PATH = "/models/selfie_segmenter.tflite"');
    expect(portrait).not.toMatch(/fetch\(\s*["'`]https?:/);
  });
});
