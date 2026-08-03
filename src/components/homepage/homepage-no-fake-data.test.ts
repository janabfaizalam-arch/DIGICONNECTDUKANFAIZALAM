import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("homepage no-fake-data contracts", () => {
  it("recent-applications API does not pad fabricated rows", () => {
    const source = read("src/app/api/recent-applications/route.ts");
    expect(source).not.toMatch(/generateFallbacks|fallbackApplications|fake/i);
    expect(source).toContain('.in("status", ["completed", "delivered"])');
  });

  it("Google reviews component does not ship invented fallback reviews", () => {
    const source = read("src/components/homepage/google-reviews.tsx");
    expect(source).not.toContain("fallbackReviews");
    expect(source).toMatch(/!reviewsList\.length.*return null|return null.*!reviewsList\.length/);
  });

  it("video testimonials stay hidden without CMS consent records", () => {
    const source = read("src/components/homepage/video-testimonials.tsx");
    expect(source).toContain("return null");
    expect(source).not.toContain("mixkit");
  });

  it("knowledge center does not invent articles", () => {
    const source = read("src/components/homepage/knowledge-center.tsx");
    expect(source).not.toContain("fallbackArticles");
    expect(source).toContain("if (!display.length) return null");
  });

  it("homepage uses Option 3 hero with public services for search", () => {
    const source = read("src/app/page.tsx");
    expect(source).toContain("HomepageHero");
    expect(source).toContain("getPublicServices");
    expect(source).toContain("getActiveHomepageSlides");
    expect(source).toContain("catalog={searchCatalog}");
    expect(source).not.toMatch(/20% Wallet Cashback on every service/);
  });
});
