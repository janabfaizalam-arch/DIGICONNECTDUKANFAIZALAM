import { describe, expect, it } from "vitest";

import { NAV_CATEGORIES, NAV_POPULAR, NAV_SCHEMES } from "@/lib/nav-menu";
import { servicesData, serviceCategories } from "@/lib/services-data";

/**
 * The header menus are a hand-maintained copy of a slice of the catalogue —
 * deliberately, so the catalogue module stays out of every page's client
 * bundle. The cost of that choice is that the two can drift, and a drifted
 * slug is a 404 in the site's main navigation. This is the guard.
 */
describe("header navigation menus", () => {
  const serviceSlugs = new Set(servicesData.map((s) => s.slug));
  const categorySlugs = new Set(serviceCategories.map((c) => c.slug));

  it("every category in the Services menu exists in the catalogue", () => {
    for (const category of NAV_CATEGORIES) {
      expect(categorySlugs, `category "${category.slug}"`).toContain(category.slug);
    }
  });

  it("every featured service in the Services menu exists in the catalogue", () => {
    for (const category of NAV_CATEGORIES) {
      for (const item of category.featured) {
        expect(serviceSlugs, `${category.slug} → "${item.slug}"`).toContain(item.slug);
      }
    }
  });

  it("every scheme in the Schemes menu exists in the catalogue", () => {
    for (const scheme of NAV_SCHEMES) {
      expect(serviceSlugs, `scheme "${scheme.slug}"`).toContain(scheme.slug);
    }
  });

  it("every popular shortcut exists in the catalogue", () => {
    for (const item of NAV_POPULAR) {
      expect(serviceSlugs, `popular "${item.slug}"`).toContain(item.slug);
    }
  });
});
