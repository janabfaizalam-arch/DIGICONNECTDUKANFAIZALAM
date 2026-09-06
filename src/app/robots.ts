import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

/**
 * What a crawler may read.
 *
 * The marketing pages are the whole point of indexing this site. Everything
 * behind a login is disallowed — not as a security control (the middleware is
 * that), but because an admin screen or a customer's application in a search
 * result is a support call and a privacy complaint, and a crawler burning its
 * budget on 200 signed-out redirects is a slower crawl of the pages that
 * matter.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/admin-login",
          "/agent/",
          "/agent-login",
          "/ap/",
          "/customer/",
          "/customer-login",
          "/customer-v2/",
          "/dashboard/",
          "/notifications/",
          "/invoice/",
          "/pay/",
          "/print/station",
          "/reset-password",
          "/forgot-password",
          "/unauthorized",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
