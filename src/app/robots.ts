import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/admin-login",
          "/ap/",
          "/agent/",
          "/customer/",
          "/customer-v2/",
          "/customer-auth-v2/",
          "/dashboard",
          "/apply/",
          "/login",
          "/customer-login",
          "/agent-login",
          "/forgot-password",
          "/reset-password",
          "/pay/",
          "/invoice/",
          "/print",
          "/unauthorized",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
