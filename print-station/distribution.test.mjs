import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SHIPPED_FILES } from "../scripts/build-print-station.mjs";

/**
 * The download must be the program.
 *
 * public/print-station/ is a copy of print-station/, and a copy is a thing
 * that rots. A shop installing next month would get whatever was committed
 * the day somebody forgot to run the build script — and would find out at a
 * counter, with a customer waiting. This fails first instead.
 */

const root = join(import.meta.dirname, "..");
const source = join(root, "print-station");
const dist = join(root, "public", "print-station");

describe("the downloadable copy", () => {
  it.each(SHIPPED_FILES)("ships %s byte-for-byte", (file) => {
    expect(existsSync(join(dist, file)), `${file} is missing from public/print-station — run node scripts/build-print-station.mjs`).toBe(true);
    expect(readFileSync(join(dist, file), "utf8")).toBe(readFileSync(join(source, file), "utf8"));
  });

  it("ships every module the program imports", () => {
    // The install script names its own file list. A module added to
    // station.mjs but not to that list installs as a crash on first run.
    const entry = readFileSync(join(source, "station.mjs"), "utf8");
    const imported = [...entry.matchAll(/from "\.\/(lib\/[a-z-]+\.mjs)"/g)].map((match) => match[1]);

    expect(imported.length).toBeGreaterThan(4);
    for (const module of imported) expect(SHIPPED_FILES).toContain(module);
  });

  it("lists every shipped module in the Windows installer too", () => {
    const installer = readFileSync(join(source, "install.ps1"), "utf8");
    for (const file of SHIPPED_FILES) {
      if (!file.startsWith("lib/")) continue;
      expect(installer, `${file} is not downloaded by install.ps1`).toContain(file);
    }
  });

  it("does not publish test files to the open internet", () => {
    const published = readdirSync(join(dist, "lib"));
    expect(published.filter((name) => name.includes(".test."))).toEqual([]);
  });

  it("has no leftover files the source no longer has", () => {
    const published = readdirSync(join(dist, "lib"));
    const shipped = SHIPPED_FILES.filter((file) => file.startsWith("lib/")).map((file) => file.slice(4));
    expect(published.sort()).toEqual(shipped.sort());
  });
});

describe("the one-line install", () => {
  const config = readFileSync(join(root, "next.config.ts"), "utf8");

  it("serves the installer as text, not as a download", () => {
    /*
      A .ps1 has no registered media type, so Next serves it as
      application/octet-stream — and PowerShell 7's Invoke-RestMethod returns
      a byte array for that, which `| iex` cannot execute. Windows PowerShell
      5.1 happens to tolerate it, so without this header the documented
      install line fails only on some shop owners' computers.
    */
    expect(config).toContain("/print-station/install.ps1");
    expect(config).toContain("text/plain; charset=utf-8");
  });

  it("keeps the installer at the path the docs tell people to run", () => {
    const readme = readFileSync(join(source, "README.md"), "utf8");
    expect(readme).toContain("/print-station/install.ps1");
    expect(SHIPPED_FILES).toContain("install.ps1");
  });
});
