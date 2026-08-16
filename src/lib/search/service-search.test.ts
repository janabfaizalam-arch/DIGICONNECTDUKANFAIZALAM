import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { servicesData } from "@/lib/services-data";
import {
  SERVICE_SYNONYMS,
  fallbackCatalog,
  normalizeQuery,
  rankServices,
  serviceHref,
  serviceSearchHref,
  suggestSpelling,
} from "@/lib/search/service-search";

const catalog = fallbackCatalog();
const topSlug = (query: string) => rankServices(catalog, query)[0]?.slug ?? null;

describe("service search ranking", () => {
  it("finds a service by its exact title", () => {
    expect(topSlug("GST Registration")).toBe("gst-registration");
  });

  it("finds a service by the abbreviation people actually type", () => {
    expect(topSlug("itr")).toBe("itr-filing");
    expect(topSlug("dl")).toBe("learning-driving-license");
    expect(topSlug("dpr")).toBe("detailed-project-report");
  });

  it("tolerates a one-character misspelling", () => {
    expect(topSlug("pasport")).toBe("passport");
  });

  it("understands Hinglish", () => {
    expect(topSlug("gaadi")).toBe("learning-driving-license");
  });

  it("returns nothing for a query with no signal", () => {
    expect(rankServices(catalog, "   ")).toEqual([]);
    expect(rankServices(catalog, "zzzzqqqq")).toEqual([]);
  });

  it("keeps Devanagari through normalisation", () => {
    // Stripping non-ASCII would silently blank a Hindi query.
    expect(normalizeQuery("पासपोर्ट!")).toBe("पासपोर्ट");
  });

  it("offers a correction only when it is close", () => {
    expect(suggestSpelling("passpot")).toMatch(/pass/i);
    expect(suggestSpelling("qwertyuiop")).toBeNull();
  });
});

describe("search destinations", () => {
  it("points every synonym key at a service that exists", () => {
    // A synonym for a deleted slug would rank a link to a 404.
    const slugs = new Set(servicesData.map((service) => service.slug));
    for (const slug of Object.keys(SERVICE_SYNONYMS)) {
      expect(slugs.has(slug), slug).toBe(true);
    }
  });

  it("builds the canonical service route", () => {
    expect(serviceHref("gst-registration")).toBe("/services/gst-registration");
  });

  it("carries an unmatched query to the directory instead of dropping it", () => {
    expect(serviceSearchHref("gst on rent")).toBe("/services?q=gst%20on%20rent");
    expect(serviceSearchHref("  ")).toBe("/services");
  });

  it("is honoured by the services directory", () => {
    // Without this the hero's fallback link would land on an unfiltered page.
    const page = readFileSync(join(process.cwd(), "src/app/services/page.tsx"), "utf8");
    expect(page).toContain("searchParams");
    expect(page).toContain("initialQuery");
  });
});

describe("the hero's popular services", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/homepage/hero-popular-services.tsx"),
    "utf8",
  );

  it("links only to slugs that exist in the catalogue", () => {
    const slugs = new Set(servicesData.map((service) => service.slug));
    const linked = [...source.matchAll(/slug: "([a-z0-9-]+)"/g)].map((match) => match[1]);

    expect(linked.length).toBe(6);
    for (const slug of linked) {
      expect(slugs.has(slug), slug).toBe(true);
    }
  });
});
