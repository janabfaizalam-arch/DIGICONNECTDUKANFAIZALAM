import { describe, expect, it } from "vitest";

import { DPR_SECTION_KEYS } from "@/lib/dpr/constants";
import { DEFAULT_DPR_REVIEWS, DPR_STATS, getDefaultDprCmsPayload } from "@/lib/dpr/defaults";
import { readCode } from "@/lib/testing/source";

/**
 * Source with its comments stripped.
 *
 * These files explain at length which invented numbers used to be here, so a
 * plain grep for "4.9" or "aggregateRating" matches the prose documenting the
 * removal. The contract is about what the page renders.
 */
const code = readCode;

const page = code("src/app/services/detailed-project-report/page.tsx");
const client = code("src/app/services/detailed-project-report/dpr-landing-client.tsx");
const shared = code("src/components/services/dpr/shared.tsx");
const intro = code("src/components/services/dpr/sections-intro.tsx");
const core = code("src/components/services/dpr/sections-core.tsx");
const convert = code("src/components/services/dpr/sections-convert.tsx");
const sticky = code("src/components/services/dpr/sticky-cta.tsx");

const SECTION_FILES = { intro, core, convert };

/* ─────────────────────────────────────────────────────────────────────────
   Nothing invented
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The DPR page shipped three testimonials that no customer wrote — a name, a
 * city and a quote each — and fed them into `Review` and `AggregateRating`
 * structured data, with a hardcoded 4.9 and a review count of 3 whenever the
 * list was empty. It also printed "4.9 ★ customer rating" as a headline
 * statistic. This is a page selling a loan document; an unverifiable number on
 * it costs more trust than it buys, and publishing one as machine-readable
 * markup misrepresents the business to everyone who indexes it.
 */
describe("the DPR landing page invents nothing", () => {
  it("ships no seeded reviews", () => {
    expect(DEFAULT_DPR_REVIEWS).toEqual([]);
    expect(getDefaultDprCmsPayload().reviews).toEqual([]);
  });

  it("claims no rating unless real reviews exist", () => {
    // The fallback average is gone: with no reviews there is no rating at all.
    expect(page).not.toMatch(/:\s*4\.9/);
    expect(page).not.toMatch(/reviewCount:\s*activeReviews\.length\s*\|\|/);
    // aggregateRating is spread in conditionally, never emitted unconditionally.
    expect(page).toMatch(/avgRating\s*!=\s*null/);
    expect(page).toMatch(/avgRating\s*=[\s\S]{0,220}?:\s*null;/);
  });

  it("prints no star rating or customer count as a statistic", () => {
    for (const stat of DPR_STATS) {
      expect(stat.suffix, `"${stat.label}" prints a star`).not.toContain("★");
      expect(stat.label.toLowerCase()).not.toMatch(/rating|happy|customers served/);
    }
  });

  it("hides the reviews band rather than filling it", () => {
    expect(convert).toMatch(/if \(!activeReviews\.length\) return null;/);
  });

  it("hides the guides band rather than inventing articles", () => {
    // Articles come from the site's own published blog rows, never a seed list.
    expect(page).toContain("getPublishedArticles");
    expect(convert).toMatch(/if \(!articles\.length\) return null;/);
  });

  it("does not promise loan approvals on a customer's behalf", () => {
    const stories = code("src/lib/dpr/defaults.ts");
    expect(stories).not.toMatch(/sanction|approved in|secure branch appraisal|accepted in first/i);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   One design system
   ───────────────────────────────────────────────────────────────────────── */

/**
 * This page used to carry a look of its own — sky-600 buttons, slate-50 bands,
 * its own card radius — which made it read as a different website reached
 * through a link. Every surface now comes from the shared system.
 */
describe("the DPR landing page uses the site's design system", () => {
  it("builds its bands on the shared section, not a private one", () => {
    expect(shared).toContain("HomepageSection");
    expect(shared).toContain("HomepageSectionHeader");
  });

  it("uses the shared card and pill classes", () => {
    expect(shared).toMatch(/lg-card/);
    expect(shared).toMatch(/lg-pill/);
  });

  it("carries no sky/slate palette of its own", () => {
    for (const [name, source] of Object.entries({ shared, ...SECTION_FILES, sticky })) {
      expect(source, `${name} still paints with sky-*`).not.toMatch(/\b(bg|text|border|ring)-sky-\d/);
      expect(source, `${name} still paints with slate-*`).not.toMatch(/\b(bg|text|border)-slate-\d/);
      expect(source, `${name} still paints with emerald-*`).not.toMatch(/\b(bg|text|border)-emerald-\d/);
    }
  });

  it("loads motion through the shared LazyMotion boundary", () => {
    expect(client).toContain("MotionRoot");
    // `strict` is on in MotionRoot, so `motion.div` would throw at runtime.
    for (const [name, source] of Object.entries(SECTION_FILES)) {
      expect(source, `${name} uses the full motion build`).not.toMatch(/\bmotion\.[a-z]/);
    }
  });

  it("ends like every other page on the site", () => {
    expect(page).toContain("MarketingFooter");
    expect(page).toContain("HomepageContactActions");
    // And starts below the fixed header, like the homepage and services pages.
    expect(page).toContain("homepage-mobile-shell");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The apply bar and the tab bar
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Both are `fixed bottom-0` and both are phone-only. Pinned to the same edge,
 * the apply bar covered Home, Dashboard and Apply completely.
 */
describe("the DPR apply bar shares the bottom of the screen", () => {
  it("stacks above the tab bar rather than on top of it", () => {
    expect(sticky).toMatch(/var\(--bottom-nav-height\)/);
    expect(sticky).not.toMatch(/\bbottom-0\b/);
  });

  it("leaves and returns with the rest of the chrome", () => {
    expect(sticky).toContain("useChromeHiddenOnScroll");
    expect(sticky).toContain("dc-chrome-slide-down");
  });

  it("does not put a second floating WhatsApp button in the same corner", () => {
    // The page's own FAB is gone; the site's is asked for on wide screens only,
    // where the apply bar is not rendered.
    expect(sticky).not.toContain("DprFloatingWhatsApp");
    expect(page).toContain("desktopOnly");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Still fully admin-driven
   ───────────────────────────────────────────────────────────────────────── */

describe("every band stays under the admin's control", () => {
  it("renders a component for each key the admin can order and toggle", () => {
    for (const key of DPR_SECTION_KEYS) {
      if (key === "sticky_cta") continue; // rendered separately, not in the list
      expect(client, `no renderer for the "${key}" section`).toContain(`case "${key}":`);
    }
  });

  it("carries default copy for every key, including the new guides band", () => {
    const defaults = getDefaultDprCmsPayload();
    const keys = new Set(defaults.sections.map((s) => s.sectionKey));
    for (const key of DPR_SECTION_KEYS) {
      expect(keys.has(key), `"${key}" has no default section row`).toBe(true);
    }
    expect(keys.has("articles")).toBe(true);
  });

  it("renders admin artwork in every band that accepts it", () => {
    for (const [name, source] of Object.entries(SECTION_FILES)) {
      expect(source, `${name} drops SectionBanners`).toContain("SectionBanners");
    }
  });
});
