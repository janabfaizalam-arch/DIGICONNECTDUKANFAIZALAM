import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BUNDLED_FILES, SHIPPED_FILES } from "../scripts/build-print-station.mjs";
import { PRINT_STATION_FILES } from "../src/lib/print/bundle-files.generated.ts";

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
    const run = bat.indexOf('"%NODE%" "%~dp0station.mjs"');
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

/* ─────────────────────────────────────────────────────────────────────────
   Printing without a window
   ───────────────────────────────────────────────────────────────────────── */

/**
 * "Terminal wali window kaat di jaye to bhi print nikle, aisa nahi ho sakta
 * kya?" It can, and it should have from the start: a console window that must
 * stay open all day is one accidental X away from a customer paying for pages
 * that never come out, and the shop only finds out when they complain.
 */
describe("the background mode", () => {
  const install = readFileSync(join(source, "Background me chalaiye.bat"), "utf8");
  const remove = readFileSync(join(source, "Background band kijiye.bat"), "utf8");
  const script = readFileSync(join(source, "lib", "background.ps1"), "utf8");
  const vbs = readFileSync(join(source, "lib", "run-hidden.vbs"), "utf8");
  const installer = readFileSync(join(source, "install.ps1"), "utf8");

  it("ships every piece, or a double-click does nothing", () => {
    for (const file of [
      "Background me chalaiye.bat",
      "Background band kijiye.bat",
      "lib/background.ps1",
      "lib/run-hidden.vbs",
      "lib/run-hidden.ps1",
    ]) {
      expect(SHIPPED_FILES, `${file} is not shipped`).toContain(file);
      expect(installer, `${file} is missing from the one-line installer`).toContain(file);
    }
  });

  it("can be undone", () => {
    expect(remove).toContain("-Remove");
    expect(script).toContain("param([switch]$Remove)");
    expect(script).toContain("Remove-Item $link -Force");
  });

  it("asks for no administrator rights", () => {
    // A shop PC's owner often is not an admin. The user's own Startup folder
    // needs nothing; a scheduled task or a service would need elevation and
    // would stop half the installs before they began.
    expect(script).toContain('[Environment]::GetFolderPath("Startup")');
    expect(script).not.toMatch(/RunAs|schtasks|New-Service|Register-ScheduledTask/);
  });

  it("starts with no window rather than a minimised one", () => {
    // WScript.Shell.Run's third argument: 0 is hidden. A minimised console
    // still sits in the taskbar waiting to be closed by mistake.
    // 0 is the third argument: hidden. A minimised console still sits in the
    // taskbar waiting to be closed by mistake.
    expect(vbs).toMatch(/shell\.Run .*station\.mjs.*, 0, False/);
    expect(script).toContain("-WindowStyle Hidden");
  });

  it("only ever stops its own program", () => {
    // Matching on node.exe alone would kill whatever else the shop runs.
    expect(script).toContain("Name = 'node.exe'");
    expect(script).toContain('$_.CommandLine -like "*station.mjs*"');
  });

  it("says out loud whether it actually came up", () => {
    // The window is gone, so "it worked" cannot be left to the shop to infer.
    expect(script).toContain("/api/state");
    expect(script).toMatch(/localhost:\$port/);
  });

  it("guards both launchers against being run on their own", () => {
    for (const [name, text] of [["install", install], ["remove", remove]]) {
      expect(text, `${name} has no folder guard`).toContain('if not exist "%~dp0station.mjs" goto :nofolder');
    }
  });

  it("keeps every launcher plain ASCII", () => {
    for (const [name, text] of [["install", install], ["remove", remove], ["background.ps1", script], ["run-hidden.vbs", vbs]]) {
      const strange = [...text].filter((character) => character.charCodeAt(0) > 126);
      expect(strange, `non-ASCII in ${name}: ${strange.join("")}`).toEqual([]);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The partner download is the same program
   ───────────────────────────────────────────────────────────────────────── */

/**
 * public/print-station/ is checked above, but that is not what a partner
 * downloads. The zip is built inside a serverless function, which cannot read
 * public/ off the disk, so its contents are compiled into
 * bundle-files.generated.ts. Nothing was checking that copy — a fix to the
 * program with the build script left unrun would have shipped a stale zip to
 * every shop while the tests stayed green.
 */
describe("the zip the dashboard hands out", () => {
  it.each(BUNDLED_FILES)("carries %s byte-for-byte", (file) => {
    expect(
      PRINT_STATION_FILES[file],
      `${file} is missing from bundle-files.generated.ts — run node scripts/build-print-station.mjs`,
    ).toBe(readFileSync(join(source, file), "utf8"));
  });

  it("carries nothing the program does not need", () => {
    expect(Object.keys(PRINT_STATION_FILES).sort()).toEqual([...BUNDLED_FILES].sort());
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Node, without the shop installing Node
   ───────────────────────────────────────────────────────────────────────── */

/**
 * "Node js download nai kar pa rahe, koi aur jugaad hai kya?" There is: stop
 * asking. Pointing a counter PC at nodejs.org was where installs died — an
 * MSI wanting administrator rights the shop assistant does not have, on a
 * page with six buttons and no way to tell which one. The program fetches the
 * portable ZIP itself instead.
 */
describe("fetching Node by itself", () => {
  const ensure = readFileSync(join(source, "lib", "ensure-node.ps1"), "utf8");
  const launcher = readFileSync(join(source, "Start Print Station.bat"), "utf8");
  const background = readFileSync(join(source, "lib", "background.ps1"), "utf8");
  const vbs = readFileSync(join(source, "lib", "run-hidden.vbs"), "utf8");
  const hidden = readFileSync(join(source, "lib", "run-hidden.ps1"), "utf8");

  it("ships and is fetched by the one-line installer too", () => {
    expect(SHIPPED_FILES).toContain("lib/ensure-node.ps1");
    expect(readFileSync(join(source, "install.ps1"), "utf8")).toContain("lib/ensure-node.ps1");
  });

  it("leaves an already-installed Node alone", () => {
    expect(ensure).toContain("Get-Command node.exe -CommandType Application");
  });

  it("takes the zip, not the installer, so no admin password is asked for", () => {
    expect(ensure).toMatch(/win-\$arch-zip/);
    expect(ensure).not.toMatch(/\.msi/i);
  });

  it("asks nodejs.org which version rather than hardcoding one", () => {
    // A pinned number goes stale and then 404s on a counter PC, which is the
    // worst possible place to discover it.
    expect(ensure).toContain("https://nodejs.org/dist/index.json");
    expect(ensure).toContain("$_.lts");
  });

  it("checks the download against the published checksum before running it", () => {
    expect(ensure).toContain("SHASUMS256.txt");
    expect(ensure).toContain("Get-FileHash");
    expect(ensure).toContain("-Algorithm SHA256");
  });

  it("reuses the fetched copy instead of downloading 30 MB every morning", () => {
    expect(ensure).toContain('Join-Path $env:LOCALAPPDATA "DigiConnectPrintStation"');
    expect(ensure).toContain("if (Test-Path $nodeExe)");
  });

  it("hands the answer over in a file, never in its own output", () => {
    // Progress messages and the answer must not share a channel, or a
    // launcher parses "Node.js download ho raha hai" as a path.
    expect(ensure).toContain("node-path.txt");
    expect(launcher).toContain("set /p NODE=<");
    expect(launcher).not.toMatch(/for \/f.*ensure-node/);
  });

  it("is used by every way of starting the program", () => {
    expect(launcher).toContain("ensure-node.ps1");
    expect(background).toContain("ensure-node.ps1");
    // The hidden runners cannot call it — they must not block or show a
    // window — so they read the path it left behind.
    expect(vbs).toContain("node-path.txt");
    expect(hidden).toContain("node-path.txt");
  });

  it("still refuses to start rather than pretending, when Node never arrives", () => {
    expect(launcher).toContain(":nonode");
    expect(background).toContain("Node.js taiyar nahi ho paya");
  });

  it("stays plain ASCII", () => {
    const strange = [...ensure].filter((character) => character.charCodeAt(0) > 126);
    expect(strange, `non-ASCII: ${strange.join("")}`).toEqual([]);
  });
});
