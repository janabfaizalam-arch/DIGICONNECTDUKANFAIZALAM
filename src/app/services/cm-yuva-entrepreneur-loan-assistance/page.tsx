import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing-footer";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import type { CmYuvaArticle, CmYuvaReview } from "@/components/services/cm-yuva/sections";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedArticles } from "@/lib/articles";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { getPublicServiceRowBySlug } from "@/lib/services";
import {
  ARTICLE_TOPICS,
  CM_YUVA_PATH,
  CM_YUVA_PRICE,
  CM_YUVA_SLUG,
  CM_YUVA_SUPPORT_PHONE,
  COMPLIANCE_NOTE,
  FAQS,
} from "@/lib/cm-yuva/content";
import CmYuvaClient from "./cm-yuva-client";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.rnos.in";

const TITLE = "CM YUVA Loan Assistance (UP) | DigiConnect Dukan";
const DESCRIPTION =
  "CM YUVA entrepreneur loan filing help for Uttar Pradesh: project report, MSME registration, document checks and portal submission. Up to ₹10 lakh with interest subvention and ₹50,000 margin money subsidy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "CM YUVA",
    "CM YUVA loan",
    "Mukhyamantri Yuva Udyami Vikas Abhiyan",
    "UP youth loan scheme",
    "CM YUVA eligibility",
    "CM YUVA apply online",
    "interest free business loan UP",
    "₹50000 margin money subsidy",
    "UP entrepreneur loan assistance",
  ],
  alternates: { canonical: CM_YUVA_PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: CM_YUVA_PATH,
    images: [
      {
        url: "/images/services/yuva/hero-banner.jpg",
        alt: "CM YUVA entrepreneur loan assistance — DigiConnect Dukan",
      },
    ],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/**
 * Structured data.
 *
 * A Service, the FAQ, and the breadcrumb — and deliberately no
 * `aggregateRating`. The service row carries reviews but no scores, so any
 * rating published here would be one nobody gave. The `termsOfService` note
 * carries the same disclaimer the page prints: approval is the bank's.
 */
function buildSchemas() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "CM YUVA Entrepreneur Loan Assistance",
      description: DESCRIPTION,
      serviceType: "Government scheme application assistance",
      areaServed: { "@type": "State", name: "Uttar Pradesh" },
      provider: {
        "@type": "Organization",
        name: "DigiConnect Dukan",
        legalName: "RNOS India Pvt Ltd",
        url: SITE_URL,
        telephone: CM_YUVA_SUPPORT_PHONE,
      },
      termsOfService: COMPLIANCE_NOTE,
      offers: {
        "@type": "Offer",
        price: CM_YUVA_PRICE,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
        {
          "@type": "ListItem",
          position: 3,
          name: "CM YUVA Entrepreneur Loan Assistance",
          item: `${SITE_URL}${CM_YUVA_PATH}`,
        },
      ],
    },
  ];
}

/**
 * The guides band reads the site's own blog.
 *
 * Anything published about the scheme, loans, subsidies or project reports
 * surfaces here, newest first. Nothing is invented: with no matching article
 * the band does not render at all.
 */
function pickArticles(articles: Awaited<ReturnType<typeof getPublishedArticles>>): CmYuvaArticle[] {
  return articles
    .filter((article) => {
      const haystack =
        `${article.category ?? ""} ${article.title} ${(article.keywords ?? []).join(" ")}`.toLowerCase();
      return ARTICLE_TOPICS.some((topic) => haystack.includes(topic));
    })
    .slice(0, 6)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      imageUrl: article.featured_image_url,
    }));
}

export default async function CmYuvaPage() {
  const [user, serviceRow, articles, socialLinks] = await Promise.all([
    getCurrentUser(),
    getPublicServiceRowBySlug(CM_YUVA_SLUG),
    getPublishedArticles(),
    getCachedFooterSocialLinks(),
  ]);

  // Reviews come from the service row an administrator maintains. There is no
  // seeded list behind this: with none entered the band does not render.
  const reviews: CmYuvaReview[] = (serviceRow?.reviews ?? [])
    .filter((review) => review?.name && review?.text)
    .map((review) => ({
      name: review.name,
      location: review.location || null,
      text: review.text,
    }));

  return (
    <>
      <main id="main-content" className="homepage-mobile-shell home-option3 min-h-screen bg-white">
        <CmYuvaClient
          isLoggedIn={Boolean(user)}
          articles={pickArticles(articles)}
          reviews={reviews}
        />
      </main>

      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />

      {buildSchemas().map((schema, index) => (
        <script
          key={`cm-yuva-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
