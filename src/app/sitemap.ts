import type { MetadataRoute } from "next";

import { getPublishedArticles } from "@/lib/articles";
import { getPublicServices } from "@/lib/services";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/services`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/featured-services`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/download-app`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms-and-conditions`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [services, articles] = await Promise.all([
    getPublicServices().catch(() => []),
    getPublishedArticles().catch(() => []),
  ]);

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${siteUrl}/services/${service.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/blog/${article.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...servicePages, ...articlePages];
}
