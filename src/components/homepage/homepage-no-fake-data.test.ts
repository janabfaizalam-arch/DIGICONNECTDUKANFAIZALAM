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

  it("homepage prices and search come from the published catalogue", () => {
    const source = read("src/app/page.tsx");
    const loader = read("src/lib/homepage/launch-data.ts");
    // What matters to this contract is that the catalogue comes from the
    // published services and checkout's own price table, not a hardcoded list.
    expect(source).toContain("getLaunchHomepageData");
    expect(source).toContain("catalogue={searchCatalog}");
    expect(loader).toContain("getCachedPublicServices");
    expect(loader).toContain('.from("agent_services")');
    // Only customer-facing columns leave the server.
    expect(loader).not.toMatch(/agent_payout|commission|partner_payout|agent_cost/);
    expect(source).not.toMatch(/20% Wallet Cashback on every service/);
  });

  it("homepage components never hardcode a rupee amount", () => {
    const files = [
      "src/app/page.tsx",
      "src/components/home-launch/sections.tsx",
      "src/components/home-launch/sections-client.tsx",
      "src/components/home-launch/launch-builder.tsx",
      "src/components/home-launch/structure-explorer.tsx",
      "src/components/home-launch/home-nav.tsx",
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/₹\s?\d|Rs\.?\s?\d/);
    }
  });

  it("illustrative scenarios are labelled, and there are no ratings or review counts", () => {
    const client = read("src/components/home-launch/sections-client.tsx");
    expect(client).toContain("Illustrative scenario");
    const all = ["src/app/page.tsx", "src/components/home-launch/sections.tsx", "src/components/home-launch/sections-client.tsx"].map(read).join("\n");
    expect(all).not.toMatch(/AggregateRating|reviewCount|ratingValue|\d+\+?\s*(happy )?customers/i);
  });
});
