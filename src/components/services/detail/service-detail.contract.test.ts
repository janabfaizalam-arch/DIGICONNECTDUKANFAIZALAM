import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  ALWAYS_RENDERED,
  buildServiceDetail,
  pickRelatedArticles,
  SERVICE_PAGE_BLUEPRINT,
  toServiceLinkCards,
  type ServicePageSlot,
} from "@/lib/services/detail-blueprint";
import type { Article } from "@/lib/articles";
import type { DbService } from "@/lib/services";
import type { ServiceItem } from "@/lib/services-data";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();
const code = readCode;

const page = code("src/components/services/detail/service-detail-page.tsx");
const route = code("src/app/services/[slug]/page.tsx");
const intro = code("src/components/services/detail/sections-intro.tsx");
const explain = code("src/components/services/detail/sections-explain.tsx");
const offer = code("src/components/services/detail/sections-offer.tsx");
const proof = code("src/components/services/detail/sections-proof.tsx");
const more = code("src/components/services/detail/sections-more.tsx");
const sections = [intro, explain, offer, proof, more].join("\n");

/* ─────────────────────────────────────────────────────────────────────────
   Test fixtures
   ───────────────────────────────────────────────────────────────────────── */

function makeService(overrides: Partial<ServiceItem> = {}): ServiceItem {
  return {
    title: "GST Registration",
    slug: "gst-registration",
    category: "Business & Tax",
    categorySlug: "business" as ServiceItem["categorySlug"],
    shortDescription: "Register your business under GST.",
    overview: "We prepare and file your GST registration.",
    benefits: ["Input credit", "Sell on marketplaces"],
    documents: ["PAN", "Aadhaar"],
    process: ["Send details", "We file", "ARN issued"],
    priceLabel: "₹999",
    amount: 999,
    ctaType: "apply",
    icon: (() => null) as unknown as ServiceItem["icon"],
    badge: "",
    faqs: [{ question: "How long?", answer: "About a week." }],
    reviews: [],
    seoTitle: "GST Registration",
    seoDescription: "GST registration service.",
    seoKeywords: ["gst", "registration"],
    blogContent: "",
    ...overrides,
  };
}

function makeRow(overrides: Partial<DbService> = {}): DbService {
  return {
    id: "1",
    category_id: null,
    category: "Business & Tax",
    title: "GST Registration",
    slug: "gst-registration",
    short_description: null,
    full_description: null,
    overview: null,
    benefits: null,
    documents: null,
    process: null,
    base_price: null,
    sale_price: null,
    is_paid: true,
    is_featured: false,
    show_on_homepage: false,
    is_active: true,
    old_price: null,
    offer_price: null,
    price_label: null,
    cta_type: "apply",
    badge: null,
    icon: null,
    hero_image_url: null,
    hero_image_storage_path: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    status: "published" as DbService["status"],
    featured: false,
    sort_order: 0,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    blog_content: null,
    faqs: null,
    reviews: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const build = (row: Partial<DbService> = {}, service: Partial<ServiceItem> = {}, rest = {}) =>
  buildServiceDetail({
    row: makeRow(row),
    service: makeService(service),
    applyHref: "/apply/gst-registration",
    whatsappHref: "https://wa.me/000",
    ...rest,
  });

/* ─────────────────────────────────────────────────────────────────────────
   One order, for every service
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Every service page used to render whatever `service_sections` held, in
 * whatever order `sort_order` said — so two services in the same category
 * could put pricing before the documents on one page and after the reviews on
 * the next. The order is fixed in one list now, and this is the list.
 */
describe("every service page has the same shape", () => {
  it("declares the agreed order, and nothing else", () => {
    expect([...SERVICE_PAGE_BLUEPRINT]).toEqual([
      "hero",
      "trustBar",
      "quickFacts",
      "overview",
      "whoIsItFor",
      "benefits",
      "whyUs",
      "howItWorks",
      "eligibility",
      "documents",
      "pricing",
      "comparison",
      "reviews",
      "stats",
      "photos",
      "videos",
      "successStories",
      "importantInfo",
      "faqs",
      "relatedBlogs",
      "relatedServices",
      "finalCta",
      "disclaimer",
    ]);
  });

  it("renders the bands by walking that list, not by hand", () => {
    // A hand-written run of JSX is how the order drifts. The page maps the
    // blueprint, so the list above is the only place order is decided.
    expect(page).toContain("SERVICE_PAGE_BLUEPRINT.map");
  });

  it("has a band for every slot and a slot for every band", () => {
    const map = page.slice(page.indexOf("const bands"), page.indexOf("return (\n    <MotionRoot>"));
    const keys = [...map.matchAll(/^\s{4}(\w+):/gm)].map((match) => match[1]);
    expect(keys.sort()).toEqual([...SERVICE_PAGE_BLUEPRINT].sort());
  });

  it("keeps the footer and the disclaimer on the page", () => {
    // The dynamic service page shipped for months with no footer at all.
    expect(route).toContain("MarketingFooter");
    expect(offer).toContain("ServiceDisclaimerSection");
    expect(offer).toMatch(/is not a government body/);
  });

  it("has retired the old page rather than leaving two", () => {
    expect(existsSync(join(root, "src/components/services/dynamic-service-page.tsx"))).toBe(false);
  });

  it("sends every duplicate slug to the one live page, form included", () => {
    /*
      Two services shipped as two rows each. A duplicate whose `status` is NULL
      is missing from every listing but still resolves for anyone holding the
      link — and `/apply/dpr-report` asked the six shared questions and none of
      the thirteen configured for the real DPR service.
    */
    const config = code("next.config.ts");
    for (const [from, to] of [
      ["/services/cm-yuva-entrepreneur-loan-assistance", "/services/cm-yuva-loan"],
      ["/services/dpr-report", "/services/detailed-project-report"],
      ["/apply/dpr-report", "/apply/detailed-project-report"],
    ]) {
      const at = config.indexOf(`source: "${from}"`);
      expect(at, `no redirect from ${from}`).toBeGreaterThan(-1);
      expect(config.slice(at, at + 200), `${from} does not land on ${to}`).toContain(`destination: "${to}"`);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   An empty slot is absent, not empty
   ───────────────────────────────────────────────────────────────────────── */

describe("a slot with no content is skipped", () => {
  it("returns nothing for the slots an administrator has not filled", () => {
    const detail = build();
    expect(detail.whoIsItFor).toBeNull();
    expect(detail.eligibility).toBeNull();
    expect(detail.successStories).toEqual([]);
    expect(detail.photos).toEqual([]);
    expect(detail.videos).toEqual([]);
    expect(detail.comparison).toBeNull();
  });

  it("guards every optional band with an early return", () => {
    // Each of these renders a heading; a heading over nothing reads as broken.
    for (const guard of [
      "if (!slot?.items.length) return null",
      "if (!detail.reviews.length) return null",
      "if (!detail.photos.length) return null",
      "if (!detail.videos.length) return null",
    ]) {
      expect(sections, `missing guard: ${guard}`).toContain(guard);
    }
  });

  it("always renders the seven bands that do not depend on data", () => {
    expect([...ALWAYS_RENDERED].sort()).toEqual(
      ["disclaimer", "finalCta", "hero", "pricing", "quickFacts", "trustBar", "whyUs"].sort(),
    );
    for (const slot of ALWAYS_RENDERED) {
      expect(SERVICE_PAGE_BLUEPRINT).toContain(slot as ServicePageSlot);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   No invented numbers
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The page used to draw five filled stars above the reviews of a service
 * nobody had reviewed. Every number on a service page has to be one the
 * business can produce a record for.
 */
describe("nothing on the page is made up", () => {
  it("shows no rating when no customer gave one", () => {
    expect(build().rating).toBeNull();
    expect(build({}, { reviews: [{ name: "A", location: "Lucknow", text: "Good" }] }).rating).toBeNull();
  });

  it("averages the ratings customers actually gave", () => {
    const detail = build({
      service_testimonials: [
        { id: "1", service_id: "1", customer_name: "A", review_text: "Good", rating: 5, photo_url: null, sort_order: 0, is_active: true },
        { id: "2", service_id: "1", customer_name: "B", review_text: "Fine", rating: 4, photo_url: null, sort_order: 1, is_active: true },
      ],
    });
    expect(detail.rating).toEqual({ average: 4.5, count: 2 });
  });

  it("quotes no turnaround the service row does not carry", () => {
    expect(build().facts.some((fact) => fact.label === "Turnaround")).toBe(false);
    expect(build({ tat_hours: 72 }).facts).toContainEqual({ label: "Turnaround", value: "3 working days" });
  });

  it("does not render a call to action as if it were a price", () => {
    // `priceLabel` falls back to the literal "Enquiry Now" for anything quoted
    // case by case, and the hero drew that at the size of a rupee figure.
    const enquiry = build({}, { offerPrice: undefined, priceLabel: "Enquiry Now" });
    expect(enquiry.price.quoted).toBe(false);
    expect(enquiry.price.display).toBe("Price on enquiry");
    expect(enquiry.facts).toContainEqual({ label: "Our fee", value: "On enquiry" });

    const priced = build({}, { offerPrice: "₹1,499", oldPrice: "₹2,499" });
    expect(priced.price).toEqual({ quoted: true, display: "₹1,499", strikethrough: "₹2,499" });
    expect(build({}, { offerPrice: undefined, priceLabel: "From ₹499" }).price.quoted).toBe(true);
  });

  it("only promises that government fees are extra where a fee was quoted", () => {
    const hero = intro.slice(intro.indexOf("export function ServiceHeroSection"), intro.indexOf("2 — Trust bar"));
    const caption = hero.indexOf("Government fees, where they apply");
    expect(caption).toBeGreaterThan(-1);
    expect(hero.slice(0, caption)).toContain("price.quoted ? (");
  });

  it("carries no customer counts or success rates in the static copy", () => {
    // The two always-rendered marketing bands are the tempting place to put one.
    const marketing = [
      intro.slice(intro.indexOf("const TRUST_POINTS")),
      explain.slice(explain.indexOf("const WHY_US"), explain.indexOf("export function ServiceHowItWorksSection")),
    ].join("\n");
    expect(marketing).not.toMatch(/\b\d[\d,]{2,}\+?\s*(customers|clients|applications|filings|users)/i);
    expect(marketing).not.toMatch(/\b\d{2,3}(\.\d)?%\s*(success|approval|satisfaction)/i);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   A bad row must not take the page down
   ───────────────────────────────────────────────────────────────────────── */

/**
 * These columns arrive as arrays on `jsonb` and as strings on `text`. Calling
 * `.map` on the string throws inside the server render and takes the page off
 * the internet — which has happened here once already.
 */
describe("a malformed row degrades instead of throwing", () => {
  it("survives a JSON column that is a string, or null, or nonsense", () => {
    const detail = build({
      service_sections: [
        { id: "a", service_id: "1", section_type: "benefits", title: "Benefits", subtitle: null, content: { items: '["One","Two"]' }, sort_order: 1, is_active: true },
        { id: "b", service_id: "1", section_type: "eligibility", title: "Who", subtitle: null, content: { items: "not json" }, sort_order: 2, is_active: true },
        { id: "c", service_id: "1", section_type: "who_is_it_for", title: null, subtitle: null, content: null, sort_order: 3, is_active: true },
      ],
    });

    expect(detail.benefits?.items).toEqual(["One", "Two"]);
    expect(detail.eligibility?.items).toEqual(["not json"]);
    expect(detail.whoIsItFor).toBeNull();
  });

  it("ignores an inactive section", () => {
    const detail = build({
      service_sections: [
        { id: "a", service_id: "1", section_type: "eligibility", title: "Who", subtitle: null, content: { items: ["Adult"] }, sort_order: 1, is_active: false },
      ],
    });
    expect(detail.eligibility).toBeNull();
  });

  it("survives keywords stored as a string when matching articles", () => {
    const article = {
      title: "GST registration explained",
      slug: "gst-explained",
      excerpt: null,
      category: null,
      featured_image_url: null,
      keywords: '["gst"]',
    } as unknown as Article;

    expect(pickRelatedArticles([article], makeService())).toHaveLength(1);
  });

  it("never lists the service among its own related services", () => {
    const cards = toServiceLinkCards(
      [makeService(), makeService({ slug: "msme-certificate", title: "MSME Certificate" })],
      "gst-registration",
    );
    expect(cards.map((item) => item.slug)).toEqual(["msme-certificate"]);
  });

  it("hands the client plain rows, never a service carrying its icon component", () => {
    // A ServiceItem's `icon` is a React component. One of those crossing the
    // server-to-client boundary fails serialization and renders an empty page
    // under a 200 — which is exactly what happened before this narrowing.
    const [card] = toServiceLinkCards([makeService({ slug: "other" })], "gst-registration");
    expect(Object.keys(card).sort()).toEqual(["description", "priceLabel", "slug", "title"]);
    expect(route).toContain("toServiceLinkCards");
    expect(route).toContain("pickRelatedArticles");
    expect(page).not.toMatch(/articles\?: Article\[\]/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Editor content is content, never markup
   ───────────────────────────────────────────────────────────────────────── */

describe("what an administrator types is not executed", () => {
  it("renders long-form content as text, not HTML", () => {
    // A service editor that renders raw HTML on a public page is an
    // unrestricted way to inject script into it.
    expect(more).not.toContain("dangerouslySetInnerHTML");
    expect(sections).not.toContain("dangerouslySetInnerHTML");
  });
});
