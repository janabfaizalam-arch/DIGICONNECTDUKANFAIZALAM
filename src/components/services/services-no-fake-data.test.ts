import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/**
 * Source with its comments removed.
 *
 * These files explain, at length, which invented numbers used to be here and
 * why they are gone — so a naive grep for "reviewsCount" or "50,000+" matches
 * the very prose that documents their removal. The contract is about what the
 * page renders, so it reads the code without the commentary.
 */
function code(rel: string) {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

/**
 * The services page used to print numbers nobody had measured: a star rating
 * and a review count typed by hand for twenty-five services, a "Top Rated"
 * sort built on those ratings, and a band claiming 50,000+ happy customers and
 * a 99% success rate. These are the contracts that keep them from coming back.
 */
describe("services directory no-fake-data contracts", () => {
  const directory = "src/components/services/services-directory-client.tsx";
  const meta = "src/lib/services/directory-meta.ts";

  it("the old duplicated directory component is gone", () => {
    expect(existsSync(join(root, "src/components/services-directory-client.tsx"))).toBe(false);
  });

  it("no invented ratings or review counts anywhere in the directory", () => {
    for (const rel of [directory, meta]) {
      const source = code(rel);
      expect(source).not.toMatch(/reviewsCount|ratingsCount/);
      expect(source).not.toMatch(/rating:\s*\d/);
      expect(source).not.toMatch(/\breviews\)/);
    }
  });

  it("does not offer a sort built on ratings", () => {
    const source = code(directory);
    expect(source).not.toMatch(/Top\s*[Rr]ated/);
  });

  it("does not claim customer counts or success rates", () => {
    const source = code(directory);
    expect(source).not.toMatch(/50,?000\+|99%|Happy Customers|Success Rate/i);
  });

  it("the ordering weight is never rendered", () => {
    const source = code(directory);
    // `weight` may be read for sorting; it must not reach the markup.
    expect(source).not.toMatch(/\{[^}]*\.weight[^}]*\}\s*</);
    expect(source).not.toMatch(/popularityScore/);
  });

  it("searches through the one shared ranker rather than a private matcher", () => {
    const source = code(directory);
    expect(source).toContain("rankServices");
    expect(source).not.toMatch(/getEditDistance|isTypoTolerantMatch/);
    expect(source).not.toMatch(/const synonyms/);
  });

  it("the page reuses the shared bands instead of duplicating them", () => {
    const source = read("src/app/services/page.tsx");
    for (const component of ["HowItWorks", "TrustStrip", "RewardCenter", "FaqAccordion", "SupportCenter"]) {
      expect(source).toContain(component);
    }
    expect(source).toContain("getHomepageFaqs");
  });
});
