import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  CM_YUVA_PRICE,
  ELIGIBLE_SECTORS,
  FAQS,
  PROCESS_STAGES,
  SCHEME_STATS,
} from "@/lib/cm-yuva/content";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();

/**
 * Source with its comments stripped.
 *
 * The content module explains at length which invented counters used to be on
 * this page, so a plain grep for "12,450" or "4.9" matches the prose that
 * documents their removal. The contract is about what the page renders.
 */
const code = readCode;

const page = code("src/app/services/cm-yuva-entrepreneur-loan-assistance/page.tsx");
const client = code("src/app/services/cm-yuva-entrepreneur-loan-assistance/cm-yuva-client.tsx");
const sections = code("src/components/services/cm-yuva/sections.tsx");
const sticky = code("src/components/services/cm-yuva/sticky-cta.tsx");
const content = code("src/lib/cm-yuva/content.ts");
const shell = code("src/components/services/shell.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   Nothing invented
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The page this replaced animated four counters on mount — 12,450 applications
 * assisted, 8,240 project reports, 10,120 MSME filings and a 4.9 rating — none
 * of which anything produced and none of which anybody could check. It also
 * rendered a ten-stage progress tracker with Completed / In Progress badges
 * hardcoded, so every visitor saw the same fabricated progress on an
 * application they had never made.
 *
 * This is a page about a government loan. An unverifiable number on it costs
 * more trust than it buys.
 */
describe("the CM YUVA page invents nothing", () => {
  it("has none of the old counters left anywhere", () => {
    for (const [name, source] of Object.entries({ page, client, sections, content })) {
      expect(source, `${name} still carries an invented count`).not.toMatch(/12,?450|8,?240|10,?120/);
      expect(source, `${name} still carries an invented rating`).not.toMatch(/\b4\.9\b/);
    }
  });

  it("has retired the orphaned page those counters lived on", () => {
    expect(existsSync(join(root, "src/components/services/cm-yuva-client-page.tsx"))).toBe(false);
  });

  it("prints no rating and no customer count as a statistic", () => {
    for (const stat of SCHEME_STATS) {
      expect(stat.suffix, `"${stat.label}" prints a star`).not.toContain("★");
      expect(stat.label.toLowerCase()).not.toMatch(/rating|happy|customers|assisted|served/);
    }
  });

  it("publishes no aggregate rating in structured data", () => {
    // The service row stores reviews but no scores, so any rating here would
    // be one nobody gave.
    expect(page).not.toContain("aggregateRating");
    expect(page).not.toContain("AggregateRating");
  });

  it("draws no stars beside a review that carries no score", () => {
    expect(sections).not.toMatch(/fill-\[var\(--dc-amber\)\] text-\[var\(--dc-amber\)\]/);
    expect(sections).not.toMatch(/\bStar\b/);
  });

  it("reads reviews from the admin's service row, and hides the band without them", () => {
    expect(page).toContain("getPublicServiceRowBySlug");
    expect(sections).toMatch(/if \(!reviews\.length\) return null;/);
  });

  /**
   * `normalizeServiceRow` and the article row both cast their JSON columns
   * rather than checking them, so what reaches the page is whatever the
   * database holds — an array on a jsonb column, a string on a text one.
   * Calling .filter or .join on a string throws during the server render and
   * takes the whole page down, on a page that renders perfectly against the
   * static fallback data used locally.
   */
  it("survives a JSON column that is not an array", () => {
    expect(page).toMatch(/Array\.isArray\(rawReviews\)/);
    expect(page).toMatch(/Array\.isArray\(article\.keywords\)/);
    expect(page, "an unguarded .join would throw on a text column").not.toMatch(
      /\(article\.keywords \?\? \[\]\)\.join/,
    );
  });

  it("reads guides from the site's own blog, and hides the band without them", () => {
    expect(page).toContain("getPublishedArticles");
    expect(sections).toMatch(/if \(!articles\.length\) return null;/);
  });

  /**
   * The progress tracker is the honest shape now: it shows the route and who
   * acts at each stage, with no per-visitor status invented.
   */
  it("shows the route without faking a status on it", () => {
    expect(sections).not.toMatch(/"In Progress"|"Completed"|tracking:/);
    for (const stage of PROCESS_STAGES) {
      expect(["DigiConnect", "Department", "Bank"]).toContain(stage.owner);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Honest about the scheme
   ───────────────────────────────────────────────────────────────────────── */

describe("the CM YUVA page is honest about what it can promise", () => {
  it("says plainly that approval is not its decision", () => {
    expect(content).toMatch(/COMPLIANCE_NOTE/);
    expect(content).toMatch(/decisions of the government department and the lending bank/i);
    // And the note renders on the page, not just in a footer somewhere.
    expect(sections).toContain("COMPLIANCE_NOTE");
  });

  it("guarantees no sanction anywhere in its copy", () => {
    for (const [name, source] of Object.entries({ sections, content })) {
      expect(source, `${name} promises an approval`).not.toMatch(
        /guarantee(?:d|s)?\s+(?:loan|approval|sanction|disbursal)/i,
      );
    }
  });

  it("explains that 'interest-free' means subvention", () => {
    expect(content).toMatch(/subvention/i);
    const subventionFaq = FAQS.find((faq) => /interest-free/i.test(faq.question));
    expect(subventionFaq, "no FAQ covers the interest-free claim").toBeTruthy();
    expect(subventionFaq!.answer).toMatch(/subvention/i);
  });

  it("keeps the researched depth the earlier page had", () => {
    expect(ELIGIBLE_SECTORS).toHaveLength(12);
    expect(FAQS.length).toBeGreaterThanOrEqual(20);
    expect(PROCESS_STAGES).toHaveLength(10);
  });

  it("quotes the same fee the application form charges", () => {
    const form = code("src/components/portal/service-application-form.tsx");
    expect(form, "the form no longer charges this amount").toContain(String(CM_YUVA_PRICE));
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   One design system
   ───────────────────────────────────────────────────────────────────────── */

describe("the CM YUVA page uses the site's design system", () => {
  it("builds its bands on the shared service shell", () => {
    expect(sections).toContain("@/components/services/shell");
    expect(sections).toContain("ServiceSection");
    expect(shell).toContain("HomepageSection");
  });

  it("carries no palette of its own", () => {
    for (const [name, source] of Object.entries({ sections, sticky, client })) {
      expect(source, `${name} paints with sky-*`).not.toMatch(/\b(bg|text|border|ring)-sky-\d/);
      expect(source, `${name} paints with slate-*`).not.toMatch(/\b(bg|text|border|ring)-slate-\d/);
      expect(source, `${name} paints with emerald-*`).not.toMatch(/\b(bg|text|border|ring)-emerald-\d/);
      expect(source, `${name} paints with indigo-*`).not.toMatch(/\b(bg|text|border|ring)-indigo-\d/);
    }
  });

  it("loads motion through the shared LazyMotion boundary", () => {
    expect(client).toContain("MotionRoot");
    // `strict` is on in MotionRoot, so `motion.div` would throw at runtime.
    expect(sections).not.toMatch(/\bmotion\.[a-z]/);
  });

  it("ends like every other page on the site", () => {
    expect(page).toContain("MarketingFooter");
    expect(page).toContain("HomepageContactActions");
    expect(page).toContain("homepage-mobile-shell");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The apply bar and the tab bar
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Both are fixed to the bottom and both are phone-only. The earlier page
 * offset its bar by a hardcoded `bottom-[72px]`, which is a guess at the tab
 * bar's height rather than a reading of it.
 */
describe("the CM YUVA apply bar shares the bottom of the screen", () => {
  it("stacks above the tab bar by reading the bar's own token", () => {
    expect(sticky).toMatch(/var\(--bottom-nav-height\)/);
    expect(sticky).not.toMatch(/bottom-\[\d+px\]/);
  });

  it("leaves and returns with the rest of the chrome", () => {
    expect(sticky).toContain("useChromeHiddenOnScroll");
    expect(sticky).toContain("dc-chrome-slide-down");
  });

  it("does not put a second floating WhatsApp button in the same corner", () => {
    expect(page).toContain("desktopOnly");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Reachable
   ───────────────────────────────────────────────────────────────────────── */

describe("the CM YUVA page is wired into the site", () => {
  it("sits at the slug the rest of the app already uses", () => {
    expect(
      existsSync(join(root, "src/app/services/cm-yuva-entrepreneur-loan-assistance/page.tsx")),
      "the route folder does not match the service slug",
    ).toBe(true);
  });

  it("renders every band it defines", () => {
    const exported = [...sections.matchAll(/export function (CmYuva\w+)/g)].map((m) => m[1]);
    expect(exported.length).toBeGreaterThan(15);
    for (const name of exported) {
      expect(client, `${name} is defined but never rendered`).toContain(`<${name}`);
    }
  });
});
