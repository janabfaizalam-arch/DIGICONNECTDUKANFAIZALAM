import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import {
  SMART_PRINT_SERVICES,
  askedOf,
  optionalAsks,
  settingsFor,
  smartPrintService,
  type PartnerDefaults,
} from "@/lib/print/smart-print";

const flow = readCode("src/components/print/smart-print-flow.tsx");
const partner = readCode("src/components/ap/smart-print-settings.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   The shop decides what is even asked
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A customer printing an Aadhaar copy has no opinion about paper finish and no
 * way to form one. Handing them the menu makes the order slower and the wrong
 * answer likelier, so a counter opens with two or three questions and the rest
 * waits for the shop to switch it on.
 */
describe("what a customer is asked", () => {
  it("asks nothing beyond the service's own short list by default", () => {
    expect(askedOf(smartPrintService("id_copy")!)).toEqual(["arrangement", "copies"]);
    expect(askedOf(smartPrintService("document")!)).toEqual(["copies", "color"]);
    expect(askedOf(smartPrintService("passport_photo")!)).toEqual([
      "photoCount",
      "backdrop",
      "filter",
      "cutBorder",
    ]);
  });

  it("never hides paper, finish or quality behind nothing — the shop has to enable them", () => {
    for (const service of SMART_PRINT_SERVICES) {
      for (const hidden of ["paper", "finish", "quality"] as const) {
        expect(
          service.always,
          `${service.id} shows ${hidden} to every customer`,
        ).not.toContain(hidden);
      }
    }
  });

  it("adds exactly what the shop turned on, and nothing else", () => {
    const defaults: PartnerDefaults = { id_copy: { allow: ["paper", "quality"] } };
    expect(askedOf(smartPrintService("id_copy")!, defaults)).toEqual([
      "arrangement",
      "copies",
      "paper",
      "quality",
    ]);
  });

  it("ignores a permission for a question the service does not have", () => {
    // A stale blob from an older release must not put a photo-count row on a
    // PDF, or a backdrop on an Aadhaar.
    const defaults = { document: { allow: ["photoCount", "backdrop"] } } as unknown as PartnerDefaults;
    expect(askedOf(smartPrintService("document")!, defaults)).toEqual(["copies", "color"]);
  });

  it("offers the shop every question it is not already asking", () => {
    for (const service of SMART_PRINT_SERVICES) {
      const offered = new Set([...service.always, ...optionalAsks(service)]);
      expect([...offered].sort(), `${service.id} has an unreachable question`).toEqual(
        [...service.asks].sort(),
      );
    }
  });
});

describe("a shop's own defaults", () => {
  it("wins over ours for the keys it set, and only those", () => {
    const passport = smartPrintService("passport_photo")!;
    const shop = settingsFor(passport, { passport_photo: { photoCount: 8, finish: "matte" } });
    expect(shop.photoCount).toBe(8);
    expect(shop.finish).toBe("matte");
    expect(shop.photoSize).toBe("35x45");
    expect(shop.quality).toBe("high");
  });

  it("keeps the permission list out of the settings it produces", () => {
    /*
      `allow` shares the blob with the values because both belong to one
      service on one station row. Spreading it in unfiltered would put an array
      of question names into the job's settings and into what gets priced.
    */
    const settings = settingsFor(smartPrintService("id_copy")!, {
      id_copy: { allow: ["paper"], color: "color" },
    });
    expect(settings).not.toHaveProperty("allow");
    expect(settings.color).toBe("color");
  });

  it("opens the counter on plain A4 at normal quality when the shop said nothing", () => {
    const settings = settingsFor(smartPrintService("id_copy")!);
    expect(settings.paper).toBe("A4");
    expect(settings.finish).toBe("normal");
    expect(settings.quality).toBe("standard");
  });

  it("opens a passport photo on what a passport photo actually is", () => {
    // 35 × 45 in colour on glossy at high quality is the order; a customer
    // should not have to assemble it.
    const settings = settingsFor(smartPrintService("passport_photo")!);
    expect(settings.photoSize).toBe("35x45");
    expect(settings.color).toBe("color");
    expect(settings.finish).toBe("glossy");
    expect(settings.quality).toBe("high");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Both screens read the same list
   ───────────────────────────────────────────────────────────────────────── */

describe("the counter and the partner screen agree", () => {
  it("filters the customer's questions through the shop's permissions", () => {
    expect(flow).toContain("askedOf(service, station.defaults)");
  });

  it("lets the partner switch each optional question on or off", () => {
    expect(partner).toContain("optionalAsks(service)");
    expect(partner).toContain("allow: [...current]");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The card, and the customer's right to their own photograph
   ───────────────────────────────────────────────────────────────────────── */

/**
 * An automatic edit to somebody's ID is only safe if it can be undone in one
 * tap. The cutout runs on upload, and the original is kept beside it rather
 * than replaced — so a customer whose card was found wrongly is one tap from
 * printing the photograph they took.
 */
describe("an automatic edit is never the only version", () => {
  it("keeps the customer's own picture alongside whatever was made of it", () => {
    expect(flow).toContain("edited: LoadedImage | null");
    expect(flow).toContain("original: LoadedImage");
    expect(flow).toContain("useEdited");
  });

  it("gives them a control to switch back", () => {
    expect(flow).toContain("onToggleEdited");
    expect(flow).toMatch(/Saaf kiya hua/);
    expect(flow).toMatch(/"Original"/);
  });

  it("says so in words when the card could not be found", () => {
    // Silence here reads as success, and the customer pays for a photograph of
    // their desk.
    expect(flow).toMatch(/kinara nahi mila/);
  });

  it("runs the cutout only where a card is expected", () => {
    expect(smartPrintService("id_copy")?.cardScan).toBe(true);
    expect(smartPrintService("passport_photo")?.cardScan).toBeFalsy();
    expect(smartPrintService("document")?.cardScan).toBeFalsy();
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   No switch that does nothing
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The counter offered two-sided printing, N-up, orientation and page ranges,
 * and the Print Station honours none of them: it hands the printer a copy
 * count, a paper size and a colour mode, and takes duplex from the shop's own
 * local setting rather than from the job. So a customer could choose "both
 * sides", pay, and be given one — which is worse than never having been asked.
 *
 * These are the four questions whose answers actually reach paper. A fifth
 * belongs here only once the agent can carry it.
 */
describe("every question reaches the printer", () => {
  const agent = readCode("public/print-station/lib/printer.mjs");
  const create = readCode("src/app/api/print/jobs/create/route.ts");

  it("asks only about things the job actually carries", () => {
    const carried = new Set([
      "copies",
      "color",
      "paper",
      // Composed here rather than at the printer: these change the sheet the
      // browser draws and uploads, so the printer needs to know nothing.
      "photoCount",
      "photoSize",
      "arrangement",
      "backdrop",
      "filter",
      "cutBorder",
      // Priced rather than printed: the shop sets its printer to match, the
      // same way it does for a walk-in.
      "finish",
      "quality",
    ]);

    for (const service of SMART_PRINT_SERVICES) {
      for (const ask of service.asks) {
        expect(carried.has(ask), `${service.id} asks "${ask}", which nothing acts on`).toBe(true);
      }
    }
  });

  it("still passes the three the agent reads", () => {
    expect(agent).toContain("job.copies");
    expect(agent).toContain("job.paper_size");
    expect(agent).toContain("job.color_mode");
    expect(create).toContain("paper_size");
    expect(create).toContain("color_mode");
  });

  it("keeps duplex where it actually lives — the shop's own machine", () => {
    // Per job it is not a setting at all; per station it is.
    expect(agent).toContain("duplex = false");
    for (const service of SMART_PRINT_SERVICES) {
      expect(service.asks, `${service.id} still asks about duplex`).not.toContain("duplex");
    }
  });
});
