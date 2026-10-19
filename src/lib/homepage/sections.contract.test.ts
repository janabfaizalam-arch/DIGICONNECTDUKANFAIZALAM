import { describe, expect, it } from "vitest";

import {
  HOMEPAGE_SECTIONS,
  defaultHomepageLayout,
  homepageSection,
  resolveHomepageLayout,
} from "@/lib/homepage/sections";
import { readCode } from "@/lib/testing/source";

const page = readCode("src/app/page.tsx");
const studio = readCode("src/components/admin/homepage-studio.tsx");
const api = readCode("src/app/api/admin/homepage/layout/route.ts");
const bridge = readCode("src/components/homepage/preview-bridge.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   The page is data now
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The company-launch homepage is one story told in a fixed order — idea,
 * structure, builder, packages, journey, compliance — so it no longer reads
 * the band arrangement saved in the Homepage Studio. The studio, its API and
 * its registry are unchanged (the tests below still hold them to account);
 * the page keeps the hooks the studio's preview relies on.
 */
describe("the company-launch homepage", () => {
  it("tags each section so the studio preview can still scroll to it", () => {
    expect(page).toContain('data-band="hero"');
    for (const id of ["structures", "builder", "packages", "faq"]) {
      expect(page).toContain(`data-band="${id}"`);
    }
  });

  it("anchors every in-page destination the navigation links to", () => {
    const nav = readCode("src/components/home-launch/home-nav.tsx");
    const anchors = [...new Set([...nav.matchAll(/href[:=]\s*"#([a-z-]+)"/g)].map((match) => match[1]))];
    expect(anchors.length).toBeGreaterThan(5);
    for (const anchor of anchors) {
      expect(page, `#${anchor} has no section`).toContain(`id="${anchor}"`);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   A bad save must not blank the homepage
   ───────────────────────────────────────────────────────────────────────── */

/**
 * This table is read on every homepage render. Every way it can be wrong has
 * to resolve to a page, because the alternative is a customer arriving at
 * nothing.
 */
describe("the layout degrades to the shipped page", () => {
  it("falls back when the rows are missing, null or nonsense", () => {
    for (const rows of [null, undefined, "not an array", {}, []]) {
      const layout = resolveHomepageLayout(rows);
      expect(layout).toHaveLength(HOMEPAGE_SECTIONS.length);
      expect(layout.every((section) => section.enabled)).toBe(true);
    }
  });

  it("drops a row for a band that no longer exists", () => {
    const layout = resolveHomepageLayout([
      { section_id: "a_band_we_deleted", position: 0, enabled: true },
      { section_id: "faq", position: 1, enabled: false },
    ]);
    expect(layout.map((section) => section.id)).not.toContain("a_band_we_deleted");
    expect(layout.find((section) => section.id === "faq")?.enabled).toBe(false);
  });

  it("shows a band added in code that nobody has saved a row for", () => {
    const layout = resolveHomepageLayout([{ section_id: "faq", position: 0, enabled: true }]);
    expect(layout).toHaveLength(HOMEPAGE_SECTIONS.length);
    expect(layout.find((section) => section.id === "about")?.enabled).toBe(true);
  });

  it("never lets the hero be moved or switched off", () => {
    // A visitor landing on a page with no heading and no search is the one
    // outcome this editor must not be able to produce.
    const layout = resolveHomepageLayout([{ section_id: "hero", position: 99, enabled: false }]);
    expect(layout[0].id).toBe("hero");
    expect(layout[0].enabled).toBe(true);
    expect(homepageSection("hero")?.locked).toBe(true);
  });

  it("orders by saved position", () => {
    const layout = resolveHomepageLayout([
      { section_id: "about", position: 1, enabled: true },
      { section_id: "faq", position: 2, enabled: true },
    ]);
    const ids = layout.map((section) => section.id);
    expect(ids.indexOf("about")).toBeLessThan(ids.indexOf("faq"));
  });

  it("starts every band on", () => {
    expect(defaultHomepageLayout().every((section) => section.enabled)).toBe(true);
    expect(defaultHomepageLayout()[0].id).toBe("hero");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Content keeps one master
   ───────────────────────────────────────────────────────────────────────── */

describe("the studio arranges bands, it does not copy their content", () => {
  it("sends only an id and a switch", () => {
    // Copy edited in two places goes out of step within a week.
    expect(studio).toContain("sections.map(({ id, enabled })");
  });

  it("points at the screen that owns each band's words", () => {
    const withEditor = HOMEPAGE_SECTIONS.filter((section) => section.editHref);
    expect(withEditor.length).toBeGreaterThan(8);
    for (const section of withEditor) {
      expect(section.editHref!.startsWith("/admin/"), `${section.id} points outside admin`).toBe(true);
    }
  });

  it("says so plainly when a band has nothing to fill in", () => {
    expect(studio).toContain("Nothing to fill in");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Untrusted input
   ───────────────────────────────────────────────────────────────────────── */

describe("the editor cannot be driven from outside", () => {
  it("checks the admin role before reading or writing", () => {
    expect(api).toContain("requireAdmin");
    expect((api.match(/await requireAdmin\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("drops an unknown section id rather than storing it", () => {
    expect(api).toContain("homepageSection(id)");
    expect(api).toContain("if (!spec || seen.has(id)) continue;");
  });

  it("takes a locked band's state from the registry, not from the request", () => {
    expect(api).toContain("spec.locked ? true :");
  });

  it("accepts preview messages only from this site's own origin", () => {
    // The homepage is public: anything embedding it could otherwise drive it.
    expect(bridge).toContain("event.origin !== window.location.origin");
  });

  it("ships the preview listener only when the page is opened as a preview", () => {
    expect(page).toContain("isPreview ? <HomepagePreviewBridge /> : null");
  });
});
