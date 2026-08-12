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
