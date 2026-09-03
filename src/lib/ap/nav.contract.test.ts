import { readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  AP_ALIAS_ROUTES,
  AP_AUTH_ROUTES,
  AP_DETAIL_ROUTES,
  AP_NAV_GROUPS,
  apActiveItem,
  apDockItems,
  apNavGroups,
  apNavItems,
} from "@/lib/ap/nav";

const root = process.cwd();

/** Every partner screen on disk, as the URL that renders it. */
function partnerScreensOnDisk(): string[] {
  const found: string[] = [];

  const walk = (dir: string, url: string) => {
    const entries = readdirSync(dir);
    if (entries.includes("page.tsx")) found.push(url || "/ap");

    for (const entry of entries) {
      const path = join(dir, entry);
      if (!statSync(path).isDirectory()) continue;
      // A dynamic segment is a detail view of its parent, never a nav target.
      if (entry.startsWith("[")) continue;
      walk(path, `${url}/${entry}`);
    }
  };

  walk(join(root, "src/app/ap"), "/ap");
  return [...new Set(found)];
}

/* ─────────────────────────────────────────────────────────────────────────
   Nothing is unreachable
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The panel had thirty-odd screens behind a seven-link bar. The offline
 * invoice book, the leads desk, the print counter, the marketing kit and the
 * knowledge base existed, worked, and could only be opened by typing the URL.
 *
 * This is the test that makes that impossible to repeat: every screen is in
 * the nav, or declared an alias, or declared a detail view. A new screen with
 * no door fails the build.
 */
describe("every partner screen has a door", () => {
  it("places every page under src/app/ap", () => {
    const placed = new Set<string>([
      ...apNavItems({ canManageTeam: true }).map((item) => item.href),
      ...Object.keys(AP_ALIAS_ROUTES),
      ...AP_DETAIL_ROUTES,
      ...AP_AUTH_ROUTES,
    ]);

    const orphans = partnerScreensOnDisk().filter((screen) => !placed.has(screen));

    expect(
      orphans,
      `These partner screens exist but are in no group, alias or detail list:\n${orphans.join("\n")}`,
    ).toEqual([]);
  });

  it("links nothing that does not exist", () => {
    const onDisk = new Set(partnerScreensOnDisk());
    const missing = apNavItems({ canManageTeam: true })
      .map((item) => item.href)
      .filter((href) => !onDisk.has(href));

    expect(missing, `The nav links screens with no page:\n${missing.join("\n")}`).toEqual([]);
  });

  it("sends every alias somewhere real", () => {
    const onDisk = new Set(partnerScreensOnDisk());
    for (const [from, to] of Object.entries(AP_ALIAS_ROUTES)) {
      expect(onDisk.has(to), `${from} redirects to ${to}, which does not exist`).toBe(true);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The map itself
   ───────────────────────────────────────────────────────────────────────── */

describe("the map a partner navigates by", () => {
  it("keeps the phone dock to five", () => {
    // Six turns a dock into a menu, and a menu at the bottom of a phone is
    // where taps go to be missed.
    expect(apDockItems().length).toBeLessThanOrEqual(5);
    expect(apDockItems().length).toBeGreaterThan(2);
  });

  it("starts the dock at the dashboard", () => {
    expect(apDockItems()[0].href).toBe("/ap/dashboard");
  });

  it("hides team screens from a partner who has no team", () => {
    const forShop = apNavItems({ canManageTeam: false }).map((item) => item.href);
    expect(forShop).not.toContain("/ap/team");
    expect(apNavItems({ canManageTeam: true })).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: "/ap/team" })]),
    );
  });

  it("drops a group that has nothing left in it", () => {
    const groups = apNavGroups({ canManageTeam: false }).map((group) => group.id);
    expect(groups).not.toContain("team");
  });

  it("matches the longest path, so a child does not answer as its parent", () => {
    expect(apActiveItem("/ap/applications/new")?.href).toBe("/ap/applications/new");
    expect(apActiveItem("/ap/applications")?.href).toBe("/ap/applications");
    expect(apActiveItem("/ap/applications/8f2c")?.href).toBe("/ap/applications");
    expect(apActiveItem("/ap/nowhere")).toBeNull();
  });

  it("says something useful about every screen", () => {
    for (const group of AP_NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.description.length, `${item.href} has no description`).toBeGreaterThan(15);
        expect(item.label.length, `${item.href} has no label`).toBeGreaterThan(2);
      }
    }
  });

  it("has no screen in two places", () => {
    const hrefs = apNavItems({ canManageTeam: true }).map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
