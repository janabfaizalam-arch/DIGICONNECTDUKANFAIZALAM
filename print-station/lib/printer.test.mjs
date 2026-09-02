import { describe, expect, it } from "vitest";

import {
  SUMATRA_CANDIDATES,
  choosePrintCommand,
  findSumatra,
  lpArgs,
  parseCupsPrinters,
  parseWindowsPrinters,
  quoteForPowerShell,
  sumatraArgs,
} from "./printer.mjs";

/**
 * What actually reaches the printer.
 *
 * These commands cannot be tried here — this machine has no printer and no
 * Windows — so the shape of every one of them is pinned instead. A wrong flag
 * is not a crash: it is a customer paying for two colour copies and
 * collecting one black-and-white page.
 */

const job = { copies: 3, pages: 4, paper_size: "A4", color_mode: "color" };

describe("sumatraArgs", () => {
  it("names the printer and asks for silence", () => {
    const args = sumatraArgs({ filePath: "C:\\t\\job.pdf", printerName: "HP LaserJet", job });
    expect(args).toContain("-print-to");
    expect(args[args.indexOf("-print-to") + 1]).toBe("HP LaserJet");
    expect(args).toContain("-silent");
    expect(args).toContain("-exit-when-done");
    expect(args.at(-1)).toBe("C:\\t\\job.pdf");
  });

  it("carries the copies the customer paid for", () => {
    const settings = settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job }));
    expect(settings).toContain("3x");
  });

  it("asks for colour only when the job did", () => {
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job }))).toContain("color");
    expect(
      settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job: { ...job, color_mode: "mono" } })),
    ).toContain("monochrome");
  });

  it("sends A3 as A3 and everything else as A4", () => {
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job: { ...job, paper_size: "A3" } }))).toContain("paper=A3");
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job }))).toContain("paper=A4");
    // A missing size must not become a missing page.
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job: { copies: 1 } }))).toContain("paper=A4");
  });

  it("never asks for fewer than one copy", () => {
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job: { copies: 0 } }))).toContain("1x");
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job: {} }))).toContain("1x");
  });

  it("adds duplex only when the shop turned it on", () => {
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job, duplex: true }))).toContain("duplex");
    expect(settingsOf(sumatraArgs({ filePath: "f", printerName: "p", job }))).not.toContain("duplex");
  });

  function settingsOf(args) {
    return args[args.indexOf("-print-settings") + 1].split(",");
  }
});

describe("lpArgs", () => {
  it("sends the queue, the copies and the file", () => {
    const args = lpArgs({ filePath: "/tmp/job.pdf", printerName: "Brother", job });
    expect(args.slice(0, 4)).toEqual(["-d", "Brother", "-n", "3"]);
    expect(args.at(-1)).toBe("/tmp/job.pdf");
  });

  it("maps colour mode onto the CUPS option, not Sumatra's word", () => {
    expect(lpArgs({ filePath: "f", printerName: "p", job })).toContain("ColorModel=RGB");
    expect(lpArgs({ filePath: "f", printerName: "p", job: { ...job, color_mode: "mono" } })).toContain("ColorModel=Gray");
  });

  it("names the media size", () => {
    expect(lpArgs({ filePath: "f", printerName: "p", job: { ...job, paper_size: "A3" } })).toContain("media=A3");
    expect(lpArgs({ filePath: "f", printerName: "p", job })).toContain("media=A4");
  });

  it("never asks for fewer than one copy", () => {
    expect(lpArgs({ filePath: "f", printerName: "p", job: { copies: -2 } })).toContain("1");
  });
});

describe("findSumatra", () => {
  it("prefers the path the shop configured", () => {
    expect(findSumatra("D:\\tools\\SumatraPDF.exe", (p) => p.startsWith("D:"))).toBe("D:\\tools\\SumatraPDF.exe");
  });

  it("falls back to where it normally installs", () => {
    const expected = SUMATRA_CANDIDATES[0];
    expect(findSumatra("", (p) => p === expected)).toBe(expected);
  });

  it("ignores a configured path that no longer exists", () => {
    // A shop that uninstalled it should fall through, not fail every job.
    expect(findSumatra("D:\\gone.exe", () => false)).toBeNull();
  });

  it("returns null when it is nowhere", () => {
    expect(findSumatra("", () => false)).toBeNull();
  });
});

describe("choosePrintCommand", () => {
  const base = { filePath: "job.pdf", printerName: "HP", job, config: {} };

  it("uses SumatraPDF on Windows when it is installed", () => {
    const plan = choosePrintCommand({ ...base, os: "win32", exists: (p) => p === SUMATRA_CANDIDATES[0] });
    expect(plan.kind).toBe("sumatra");
    expect(plan.command).toBe(SUMATRA_CANDIDATES[0]);
  });

  it("falls back to the Windows shell verb, and says what that costs", () => {
    const plan = choosePrintCommand({ ...base, os: "win32", exists: () => false });
    expect(plan.kind).toBe("shell-verb");
    expect(plan.command).toBe("powershell.exe");
    // The shop is told rather than left to wonder why copies came out as one.
    expect(plan.degraded).toMatch(/copies/i);
  });

  it("uses lp everywhere else", () => {
    expect(choosePrintCommand({ ...base, os: "linux", exists: () => false }).command).toBe("lp");
    expect(choosePrintCommand({ ...base, os: "darwin", exists: () => false }).command).toBe("lp");
  });
});

describe("quoteForPowerShell", () => {
  it("wraps a path in single quotes", () => {
    expect(quoteForPowerShell("C:\\Users\\Shop\\job.pdf")).toBe("'C:\\Users\\Shop\\job.pdf'");
  });

  it("escapes a quote rather than ending the string on it", () => {
    // A printer named O'Brien Copy Shop must not be able to end the argument
    // and start a command.
    expect(quoteForPowerShell("O'Brien")).toBe("'O''Brien'");
  });

  it("leaves a semicolon inert inside the quotes", () => {
    expect(quoteForPowerShell("a; Remove-Item C:\\")).toBe("'a; Remove-Item C:\\'");
  });
});

describe("printer listings", () => {
  it("reads Windows printer names and drops the header", () => {
    expect(parseWindowsPrinters("Name\r\n----\r\nHP LaserJet\r\nMicrosoft Print to PDF\r\n")).toEqual([
      "HP LaserJet",
      "Microsoft Print to PDF",
    ]);
  });

  it("reads the queue name out of lpstat's prose", () => {
    expect(parseCupsPrinters("HP_LaserJet accepting requests since Mon\nBrother_DCP accepting requests\n")).toEqual([
      "HP_LaserJet",
      "Brother_DCP",
    ]);
  });

  it("returns nothing rather than a blank entry when no printer exists", () => {
    expect(parseWindowsPrinters("")).toEqual([]);
    expect(parseCupsPrinters("\n\n")).toEqual([]);
  });
});
