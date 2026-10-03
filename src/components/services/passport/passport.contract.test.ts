import { readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { PASSPORT_DISCLAIMER, PASSPORT_FAQS, PASSPORT_VISUALS, resolveFaqs } from "@/lib/passport/content";
import { readCode } from "@/lib/testing/source";

const DIR = "src/components/services/passport";
const ROUTE = "src/app/services/passport/page.tsx";
const CONTENT = "src/lib/passport/content.ts";

const componentFiles = readdirSync(join(process.cwd(), DIR))
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => `${DIR}/${file}`);

const everything = [...componentFiles, ROUTE, CONTENT].map((rel) => ({ rel, code: readCode(rel) }));

/**
 * The passport page's promises, kept as code.
 *
 * It is a marketing page for a private assistance service selling help with a
 * government document, which makes three kinds of mistake expensive: a price
 * that disagrees with checkout, a number nobody measured, and a sentence that
 * reads as a guarantee or as the government speaking.
 */
describe("passport page contracts", () => {
  it("never writes the price into the page — it comes from the services row", () => {
    for (const { rel, code } of everything) {
      expect(code, rel).not.toMatch(/2,?999/);
    }
    const route = readCode(ROUTE);
    expect(route).toContain("getPublicServiceRowBySlug");
    expect(route).toContain("serviceFromDb");
  });

  it("starts applications through the existing apply flow, via login when signed out", () => {
    const route = readCode(ROUTE);
    expect(route).toContain("`/apply/${PASSPORT_SLUG}`");
    expect(route).toContain("/login/customer?redirect=");
    for (const { rel, code } of everything) {
      expect(code, rel).not.toMatch(/\/api\/create-order|razorpay/i);
    }
  });

  it("claims no invented ratings, counts or success rates", () => {
    for (const { rel, code } of everything) {
      expect(code, rel).not.toMatch(/\d[\d,]*\+\s*(customers|applications|passports|users)/i);
      expect(code, rel).not.toMatch(/\d+(\.\d+)?\s*%\s*(success|approval)/i);
      expect(code, rel).not.toMatch(/ratingValue|reviewCount|AggregateRating|★/);
      expect(code, rel).not.toMatch(/years of experience/i);
    }
  });

  it("makes no guarantees and invents no urgency", () => {
    for (const { rel, code } of everything) {
      expect(code, rel).not.toMatch(/100% (secure|guaranteed)|unhackable|guaranteed (approval|appointment|security)|instant passport|government approved/i);
      expect(code, rel).not.toMatch(/only \d+ slots|limited offer|offer ends|countdown/i);
    }
  });

  it("says plainly that it is not a government website", () => {
    expect(PASSPORT_DISCLAIMER).toMatch(/not a government website/);
    expect(PASSPORT_DISCLAIMER).toMatch(/not .*affiliated with Passport Seva/);
    expect(readCode(`${DIR}/passport-finale.tsx`)).toContain("PASSPORT_DISCLAIMER");
    expect(PASSPORT_FAQS.some((faq) => /government website/.test(faq.question))).toBe(true);
  });

  it("keeps the official fee separate from the service charge", () => {
    const answer = PASSPORT_FAQS.find((faq) => /government fee/i.test(faq.question))?.answer ?? "";
    expect(answer).toMatch(/^No\./);
    expect(answer).toMatch(/separate/);
  });

  it("puts in FAQ schema exactly the questions the page shows", () => {
    const route = readCode(ROUTE);
    expect(route).toMatch(/buildSchemas\(amount, faqs\)/);
    expect(route).toMatch(/<PassportPage links=\{links\} faqs=\{faqs\} \/>/);
    const resolved = resolveFaqs("₹1");
    expect(resolved).toHaveLength(PASSPORT_FAQS.length);
    expect(resolved.every((faq) => !faq.question.includes("{price}"))).toBe(true);
  });

  it("draws a stand-in for every scene whose artwork has not been added", () => {
    for (const [key, visual] of Object.entries(PASSPORT_VISUALS)) {
      if (visual.src) expect(visual.src, key).toMatch(/^\/images\/services\/passport\/.+\.webp$/);
    }
    expect(PASSPORT_VISUALS.hero.src).toBeTruthy();
    expect(PASSPORT_VISUALS.heroPortrait.src).toBeTruthy();
  });
});
