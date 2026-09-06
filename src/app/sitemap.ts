import type { MetadataRoute } from "next";

import { serviceCategories, servicesData } from "@/lib/services-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

/**
 * The pages worth indexing, built from the catalogue rather than a hand list.
 *
 * A sitemap typed out by hand goes stale the first time a service is added,
 * and the stale half is invisible — nothing errors, the new page is simply
 * never crawled. These come from `servicesData`, the same source the
 * navigation and the directory read, so a service that exists is a service
 * that is listed.
 *
 * Signed-in areas are absent on purpose; `robots.ts` disallows them too.
 */
type Entry = MetadataRoute.Sitemap[number];

/** Pages that stand on their own, with how often they actually change. */
const STATIC: Array<{ path: string; changeFrequency: Entry["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/featured-services", changeFrequency: "weekly", priority: 0.6 },
  { path: "/about", changeFrequency: "yearly", priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/digi-partner", changeFrequency: "monthly", priority: 0.7 },
  { path: "/print", changeFrequency: "monthly", priority: 0.7 },
  { path: "/download-app", changeFrequency: "monthly", priority: 0.5 },
  { path: "/track-application", changeFrequency: "monthly", priority: 0.6 },
  { path: "/insurance-quotation", changeFrequency: "monthly", priority: 0.6 },
  { path: "/credit-cards", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  for (const category of serviceCategories) {
    entries.push({
      url: `${siteUrl}/services?category=${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  /*
    Deduplicated by slug: a few services appear under more than one category,
    and a sitemap that lists the same URL twice is a sitemap a crawler trusts
    slightly less.
  */
  const seen = new Set<string>();
  for (const service of servicesData) {
    if (!service.slug || seen.has(service.slug)) continue;
    seen.add(service.slug);
    entries.push({
      url: `${siteUrl}/services/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
