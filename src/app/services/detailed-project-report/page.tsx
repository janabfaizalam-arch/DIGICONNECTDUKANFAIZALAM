import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing-footer";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedArticles } from "@/lib/articles";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { getDprCmsPayload } from "@/lib/dpr/cms";
import { DPR_LANDING_PATH, DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import type { DprArticleCard } from "@/lib/dpr/types";
import DprLandingClient from "./dpr-landing-client";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.rnos.in";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getDprCmsPayload();
  const { settings } = cms;
  const title =
    settings.metaTitle || "Detailed Project Report (DPR) Online | DigiConnect Dukan";
  const description =
    settings.metaDescription ||
    "Get a bank-ready Detailed Project Report for PMEGP, Mudra, CM Yuva & MSME schemes. Launch offer ₹399 with DigiConnect Dukan.";

  return {
    title,
    description,
    keywords: [
      "detailed project report",
      "DPR online",
      "PMEGP DPR",
      "Mudra DPR",
      "CM Yuva project report",
      "MSME loan DPR",
      "bank ready DPR India",
    ],
    alternates: {
      canonical: DPR_LANDING_PATH,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: DPR_LANDING_PATH,
      images: [
        {
          url: "/icon.png",
          width: 512,
          height: 512,
          alt: "Detailed Project Report — DigiConnect Dukan",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function buildSchemas(cms: Awaited<ReturnType<typeof getDprCmsPayload>>) {
  const activeFaqs = cms.faqs.filter((f) => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeReviews = cms.reviews.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const featuredPlan =
    cms.pricing.find((p) => p.planKey === cms.settings.defaultPlanId) ??
    cms.pricing.find((p) => p.isFeatured) ??
    cms.pricing[0];
  const price = featuredPlan?.price ?? DPR_LAUNCH_PRICE;
  /*
    A rating is published only when there are real reviews to average.

    This used to fall back to 4.9 with a review count of 3 when the list was
    empty, which put a rating into structured data that no customer had ever
    given. An aggregate rating is a claim about other people's experience; it
    is emitted here when, and only when, an administrator has entered reviews.
  */
  const ratingValues = activeReviews.map((r) => r.rating);
  const avgRating =
    ratingValues.length > 0
      ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1))
      : null;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "DigiConnect Dukan",
      legalName: "RNOS India Pvt Ltd",
      url: SITE_URL,
      telephone: cms.settings.supportPhone,
      areaServed: "IN",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Detailed Project Report (DPR)",
      description: cms.settings.metaDescription,
      provider: {
        "@type": "Organization",
        name: "DigiConnect Dukan",
      },
      serviceType: "Business & Loan Documentation",
      areaServed: "India",
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
      ...(avgRating != null
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avgRating,
              reviewCount: activeReviews.length,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: activeFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Services",
          item: `${SITE_URL}/services`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Detailed Project Report",
          item: `${SITE_URL}${DPR_LANDING_PATH}`,
        },
      ],
    },
    ...activeReviews.slice(0, 5).map((review) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "Service",
        name: "Detailed Project Report (DPR)",
      },
      author: {
        "@type": "Person",
        name: review.name,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.text,
    })),
  ];
}

/**
 * The DPR guides band reads the site's own blog.
 *
 * Anything filed under a project-report, loan or scheme category — or written
 * about one in its title — surfaces here, newest first. Nothing is invented:
 * with no matching published article the band does not render.
 */
const ARTICLE_TOPICS = ["dpr", "project report", "loan", "scheme", "pmegp", "mudra", "msme", "subsidy"];

function pickDprArticles(articles: Awaited<ReturnType<typeof getPublishedArticles>>): DprArticleCard[] {
  const matches = articles.filter((article) => {
    const haystack = `${article.category ?? ""} ${article.title} ${(article.keywords ?? []).join(" ")}`.toLowerCase();
    return ARTICLE_TOPICS.some((topic) => haystack.includes(topic));
  });

  return matches.slice(0, 6).map((article) => ({
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    imageUrl: article.featured_image_url,
  }));
}

export default async function DetailedProjectReportPage() {
  const [user, cms, articles, socialLinks] = await Promise.all([
    getCurrentUser(),
    getDprCmsPayload(),
    getPublishedArticles(),
    getCachedFooterSocialLinks(),
  ]);

  return (
    <>
      <main id="main-content" className="homepage-mobile-shell home-option3 min-h-screen bg-white">
        <DprLandingClient
          isLoggedIn={Boolean(user)}
          cms={cms}
          articles={pickDprArticles(articles)}
        />
      </main>

      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />

      {buildSchemas(cms).map((schema, index) => (
        <script
          key={`dpr-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
