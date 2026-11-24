import { describe, expect, it } from "vitest";

import { parseCupsDefault, pickStartupPrinter } from "./printer.mjs";
import { choosePrinter, createWorker } from "./worker.mjs";
import { restartDelaySeconds } from "./keepalive-station.mjs";

/**
 * The printer is chosen from the partner panel, and a fresh install prints
 * without anybody opening a setup page. These pin the rules that make both
 * safe: a panel choice is only used when this PC really has that printer, and
 * the automatic choice never lands on a "Save as PDF" printer.
 */

describe("which printer a job goes to", () => {
  const printers = ["HP LaserJet", "Epson L3150", "Microsoft Print to PDF"];

  it("sends colour jobs to the colour printer chosen in the panel", () => {
    expect(
      choosePrinter({
        job: { color_mode: "color" },
        serverPrinter: "HP LaserJet",
        serverColorPrinter: "Epson L3150",
        printers,
        fallback: "HP LaserJet",
      }),
    ).toBe("Epson L3150");
  });

  it("sends black-and-white jobs to the main printer", () => {
    expect(
      choosePrinter({
        job: { color_mode: "mono" },
        serverPrinter: "HP LaserJet",
        serverColorPrinter: "Epson L3150",
        printers,
        fallback: "Epson L3150",
      }),
    ).toBe("HP LaserJet");
  });

  it("ignores a panel choice this computer does not have", () => {
    expect(
      choosePrinter({
        job: { color_mode: "color" },
        serverPrinter: "Old PC Printer",
        serverColorPrinter: "Gone",
        printers,
        fallback: "HP LaserJet",
      }),
    ).toBe("HP LaserJet");
  });

  it("uses the PC's own choice when the panel has none", () => {
    expect(choosePrinter({ job: {}, serverPrinter: null, serverColorPrinter: null, printers, fallback: "X" })).toBe("X");
  });
});

describe("the printer picked on a fresh install", () => {
  it("is the computer's default when that is a real printer", () => {
    expect(pickStartupPrinter(["A", "B"], "B")).toBe("B");
  });

  it("skips virtual printers that would swallow a paid job into a file", () => {
    expect(pickStartupPrinter(["Microsoft Print to PDF", "OneNote", "Canon G2010"], "Microsoft Print to PDF")).toBe(
      "Canon G2010",
    );
  });

  it("is nothing when the computer has only virtual printers", () => {
    expect(pickStartupPrinter(["Microsoft XPS Document Writer"], null)).toBeNull();
  });

  it("reads the CUPS default", () => {
    expect(parseCupsDefault("system default destination: Brother_HL")).toBe("Brother_HL");
    expect(parseCupsDefault("no system default destination")).toBeNull();
  });
});

describe("the worker passes the panel's printer choice on", () => {
  it("records the station's printers from each poll, and reports fresh printer lists", async () => {
    let current = ["A"];
    const seen = [];
    const state = {};
    const worker = createWorker({
      api: {
        listJobs: async (printers) => {
          seen.push(printers);
          return { jobs: [], station: { display_name: "Shop", printer_name: "A", color_printer_name: "B" } };
        },
      },
      config: { pollSeconds: 5 },
      print: async () => {},
      log: () => {},
      state,
      getPrinters: () => current,
    });

    await worker.tick();
    current = ["A", "B"];
    await worker.tick();

    expect(state.serverPrinter).toBe("A");
    expect(state.serverColorPrinter).toBe("B");
    expect(seen).toEqual([["A"], ["A", "B"]]);
  });
});

describe("the keepalive", () => {
  it("restarts quickly at first and backs off to a minute", () => {
    expect(restartDelaySeconds(1)).toBe(2);
    expect(restartDelaySeconds(2)).toBe(4);
    expect(restartDelaySeconds(10)).toBe(60);
  });
});
