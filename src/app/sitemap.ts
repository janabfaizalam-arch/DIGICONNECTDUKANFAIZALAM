import type { MetadataRoute } from "next";

import { getAllServiceSlugs } from "@/lib/services-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/services", "/about", "/contact", "/privacy-policy", "/terms-and-conditions", "/refund-policy", "/track", "/login", "/signup"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: new Date(),
    })),
    ...getAllServiceSlugs().map((slug) => ({
      url: `${siteUrl}/services/${slug}`,
      lastModified: new Date(),
    })),
  ];
}
