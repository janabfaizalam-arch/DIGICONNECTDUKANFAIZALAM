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

describe("knowing which build is running", () => {
  /*
    A shop chased an already-fixed bug for an afternoon because nothing said
    which version was running, and every download had produced a folder with
    the same name. The version now appears in the log's first line, on the
    settings page, and in the downloaded file's name.
  */
  const version = readFileSync(join(source, "lib", "version.mjs"), "utf8");
  const station = readFileSync(join(source, "station.mjs"), "utf8");
  const generated = readFileSync(join(root, "src", "lib", "print", "bundle-version.generated.ts"), "utf8");
  const download = readFileSync(join(root, "src", "app", "api", "ap", "print-station", "download", "route.ts"), "utf8");

  it("ships the version file, or the program cannot start", () => {
    expect(SHIPPED_FILES).toContain("lib/version.mjs");
    expect(station).toContain("PRINT_STATION_VERSION");
  });

  it("says the version in the log's first line", () => {
    expect(station).toContain("log.push(\"info\", `DigiConnect Print Station v${PRINT_STATION_VERSION}`)");
  });

  it("names the version and the date in the download, so the newest is obvious", () => {
    expect(download).toContain("PRINT_STATION_VERSION");
    expect(download).toContain("toISOString().slice(0, 10)");
  });

  it("keeps the site's copy of the version identical to the program's", () => {
    // Generated from the same file, so the filename can never claim a build
    // the program does not report.
    const declared = /PRINT_STATION_VERSION = "([^"]+)"/.exec(version)?.[1];
    expect(declared).toBeTruthy();
    expect(generated).toContain(`"${declared}"`);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Run from the wrong place
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A shop dragged "Start Print Station" out of the zip onto the Desktop and
 * ran it there. Node looked for station.mjs beside it, found nothing, and
 * threw MODULE_NOT_FOUND with a stack trace — which reads as "the program is
 * broken", not "the file is in the wrong folder". It had printed fine the
 * evening before, from inside the extracted folder.
 */
describe("the launcher, when it is on its own", () => {
  const bat = readFileSync(join(source, "Start Print Station.bat"), "utf8");
  const sh = readFileSync(join(source, "start-print-station.sh"), "utf8");

  it("checks for station.mjs before handing anything to node", () => {
    const guard = bat.indexOf("station.mjs\" goto :nofolder");
    const run = bat.indexOf("node \"%~dp0station.mjs\"");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(run);
  });

  it("says what to do about it instead of printing a stack trace", () => {
    expect(bat).toContain(":nofolder");
    expect(bat).toMatch(/Extract All/);
    // The folder it actually tried, so a phone screenshot carries the answer.
    expect(bat).toContain("echo   %~dp0");
  });

  it("stays plain ASCII, because a shop console is not UTF-8", () => {
    const strange = [...bat].filter((character) => character.charCodeAt(0) > 126);
    expect(strange, `non-ASCII in the launcher: ${strange.join("")}`).toEqual([]);
  });

  it("guards the mac and linux launcher the same way", () => {
    expect(sh).toContain("! -f ./station.mjs");
  });
});
