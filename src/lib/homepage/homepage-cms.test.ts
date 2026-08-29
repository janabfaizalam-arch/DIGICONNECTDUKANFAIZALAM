import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { buildFaqJsonLd, groupFaqsByCategory, type HomepageFaq } from "@/lib/homepage/faqs";
import {
  MIN_REVIEWS_FOR_AGGREGATE,
  averageRating,
  buildAggregateRatingJsonLd,
  toEmbedUrl,
  type HomepageTestimonial,
} from "@/lib/homepage/testimonials";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const faq = (over: Partial<HomepageFaq> = {}): HomepageFaq => ({
  id: crypto.randomUUID(),
  question: "How long does GST registration take?",
  answer: "Usually 3-7 working days once documents are complete.",
  category: "Services",
  sort_order: 0,
  is_active: true,
  ...over,
});

const review = (over: Partial<HomepageTestimonial> = {}): HomepageTestimonial => ({
  id: crypto.randomUUID(),
  customer_name: "Ramesh",
  customer_location: "Lucknow",
  review_text: "Fast and helpful.",
  rating: 5,
  photo_url: null,
  service_label: null,
  video_url: null,
  video_thumbnail_url: null,
  consent_confirmed: true,
  sort_order: 0,
  is_active: true,
  ...over,
});

describe("FAQ grouping", () => {
  it("keeps categories in the order the rows arrived", () => {
    const groups = groupFaqsByCategory([
      faq({ category: "Payments" }),
      faq({ category: "Tracking" }),
      faq({ category: "Payments" }),
    ]);

    expect(groups.map((g) => g.category)).toEqual(["Payments", "Tracking"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("falls back to General for a blank category", () => {
    expect(groupFaqsByCategory([faq({ category: "   " })])[0].category).toBe("General");
  });
});

describe("FAQ structured data", () => {
  it("emits a FAQPage entry per question", () => {
    const jsonLd = buildFaqJsonLd([faq(), faq({ question: "Do you store my documents?" })]);
    expect(jsonLd?.["@type"]).toBe("FAQPage");
    expect((jsonLd?.mainEntity as unknown[]).length).toBe(2);
  });

  it("drops incomplete rows rather than emitting empty answers", () => {
    // A blank acceptedAnswer invalidates the whole rich result, so one bad row
    // would cost the rich snippet for every other question.
    const jsonLd = buildFaqJsonLd([faq(), faq({ answer: "   " }), faq({ question: "" })]);
    expect((jsonLd?.mainEntity as unknown[]).length).toBe(1);
  });

  it("returns null when there is nothing to describe", () => {
    expect(buildFaqJsonLd([])).toBeNull();
    expect(buildFaqJsonLd([faq({ answer: "" })])).toBeNull();
  });
});

describe("testimonial ratings", () => {
  it("averages to one decimal", () => {
    expect(averageRating([review({ rating: 5 }), review({ rating: 4 })])).toBe(4.5);
    expect(averageRating([review({ rating: 5 }), review({ rating: 4 }), review({ rating: 4 })])).toBe(4.3);
  });

  it("ignores unrated rows instead of counting them as zero", () => {
    expect(averageRating([review({ rating: 5 }), review({ rating: 0 })])).toBe(5);
    expect(averageRating([])).toBeNull();
  });

  it("withholds an aggregate rating below the minimum review count", () => {
    // "5.0 from 1 review" is worthless to a reader and risks a manual action.
    const few = Array.from({ length: MIN_REVIEWS_FOR_AGGREGATE - 1 }, () => review());
    expect(buildAggregateRatingJsonLd(few, "RNOS India")).toBeNull();

    const enough = Array.from({ length: MIN_REVIEWS_FOR_AGGREGATE }, () => review());
    const jsonLd = buildAggregateRatingJsonLd(enough, "RNOS India");
    expect(jsonLd).not.toBeNull();
    expect((jsonLd?.aggregateRating as Record<string, unknown>).reviewCount).toBe(MIN_REVIEWS_FOR_AGGREGATE);
  });
});

describe("video embedding", () => {
  it("converts every shape of YouTube link an admin might paste", () => {
    const expected = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    for (const input of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
    ]) {
      expect(toEmbedUrl(input), input).toBe(expected);
    }
  });

  it("handles Vimeo", () => {
    expect(toEmbedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("refuses non-https and empty values", () => {
    expect(toEmbedUrl("http://example.com/video.mp4")).toBeNull();
    expect(toEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(toEmbedUrl("")).toBeNull();
    expect(toEmbedUrl(null)).toBeNull();
  });
});

describe("publication safety", () => {
  it("filters unconsented testimonials in code, not only in RLS", () => {
    // The public read path uses the service-role client, which bypasses RLS —
    // so the policy alone would not stop an unconsented row being published.
    // The public page reads this through a cache, which makes the filter more
    // important rather than less: a cache in front of an unfiltered query
    // would publish an unconsented row and then keep serving it.
    const lib = readSrc("src/lib/homepage/testimonials.ts");
    const publicFn = lib.slice(
      lib.indexOf("export async function getHomepageTestimonials"),
      lib.indexOf("export async function listHomepageTestimonialsForAdmin"),
    );
    expect(publicFn).toContain('eq("consent_confirmed", true)');
  });

  it("still enforces consent in the RLS policy as defence in depth", () => {
    const migration = readSrc("supabase/migrations/20260812130000_homepage_faqs_testimonials.sql");
    expect(migration).toMatch(/homepage_testimonials[\s\S]{0,400}consent_confirmed = true/);
  });

  it("degrades to the built-in FAQ when the migration has not been run", () => {
    // The customer homepage must not 500 on a deploy that precedes the SQL.
    const lib = readSrc("src/lib/homepage/faqs.ts");
    expect(lib).toContain("42P01");
    expect(lib).toMatch(/return \[\];/);
  });
});

describe("hero search panel dismissal", () => {
  const search = readSrc("src/components/homepage/hero-service-search.tsx");
  const hero = readSrc("src/components/homepage/homepage-hero.tsx");

  it("closes on an outside click and on Escape", () => {
    // The old close path was a full-screen backdrop rendered inside the
    // search's own stacking context, so anything painting above it swallowed
    // the click and the panel stayed open.
    expect(search).toContain('document.addEventListener("pointerdown"');
    expect(search).toMatch(/event\.key === "Escape"/);
    expect(search).toContain("rootRef");
  });

  it("no longer relies on a backdrop element", () => {
    expect(search).not.toContain("Click catcher backdrop");
    expect(search).not.toMatch(/fixed inset-0 z-10 bg-transparent/);
  });

  it("reopens when the already-focused input is clicked again", () => {
    // Escape leaves DOM focus on the input, so onFocus alone never fires again
    // and the box looks dead.
    expect(search).toMatch(/onClick=\{\(\) => setIsOpen\(true\)\}/);
  });

  it("keeps the panel above the hero CTAs", () => {
    // The entrance animation applies a transform, which creates a stacking
    // context; without an explicit z-index the panel is trapped beneath the
    // buttons that follow it.
    expect(hero).toContain("dc-hero-rise relative z-40");
  });

  it("renders the panel opaque", () => {
    // A translucent panel let the buttons behind it show through, which read
    // as a rendering fault rather than a design.
    expect(search).toContain("bg-white p-3 text-left");
    expect(search).not.toMatch(/bg-white\/9\d/);
  });
});

describe("hero artwork", () => {
  const hero = readSrc("src/components/homepage/homepage-hero.tsx");

  it("still lets an admin set the hero atmosphere from the slides CMS", () => {
    expect(hero).toContain("leadSlide?.image_url");
    expect(hero).toContain("leadSlide?.mobile_image_url");
  });

  it("only honours https artwork", () => {
    // Anything else would render as a broken image on the busiest page.
    expect(hero).toMatch(/slideImage\.startsWith\("https:\/\/"\)/);
    expect(hero).toContain("atmosphereImage");
  });

  it("falls back to the CSS/SVG composition rather than a bundled photo", () => {
    // The redesigned hero draws its own background, so there is no large
    // raster to download when no slide image is configured.
    expect(hero).not.toContain("HOMEPAGE_HERO_DESKTOP");
  });
});
