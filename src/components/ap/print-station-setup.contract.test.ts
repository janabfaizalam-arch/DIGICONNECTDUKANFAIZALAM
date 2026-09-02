import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const setup = readCode("src/components/ap/print-station-setup.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   The download never disappears
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The program does not update itself. A fix only reaches a shop when the
 * partner fetches the file again — so hiding the download once the station
 * connected left a working shop running a fortnight-old build with no button
 * on the screen to escape it. That happened: a photo-printing fix shipped,
 * the partner was told to download the new build, and there was nowhere to
 * download it from.
 */
describe("a connected station can still get a newer build", () => {
  it("renders the install block whatever the connection state", () => {
    expect(setup).toContain("<InstallSteps siteUrl={siteUrl} connected={station.agent_connected} />");
  });

  it("never gates the block on being connected", () => {
    expect(setup).not.toMatch(/agent_connected\s*\?\s*null\s*:\s*<InstallSteps/);
  });

  it("keeps the download link out of every conditional inside the block", () => {
    // The href is what a partner is hunting for. It is rendered flat, at the
    // top of the block; only the first-time steps fold away.
    const link = setup.indexOf('href="/api/ap/print-station/download"');
    expect(link).toBeGreaterThan(-1);
    const block = setup.slice(setup.indexOf("function InstallSteps"), link);
    expect(block).not.toContain("{connected ?");
  });

  it("names the build on the button so a stale folder is obvious", () => {
    expect(setup).toContain("PRINT_STATION_VERSION");
    expect(setup).toContain("@/lib/print/bundle-version.generated");
  });

  it("warns that downloading again retires the running key", () => {
    // Rotating is unavoidable — the stored key is a hash — so the screen has
    // to say it, or a partner leaves the old folder running and it goes dead.
    expect(setup).toMatch(/nayi key banti hai aur purani band ho jati/i);
  });
});
