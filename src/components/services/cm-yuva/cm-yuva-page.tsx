import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing-footer";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import type { CmYuvaArticle, CmYuvaReview } from "@/components/services/cm-yuva/sections";
import CmYuvaClient from "@/components/services/cm-yuva/cm-yuva-client";
import { getCurrentUser } from "@/lib/auth";
import { getPublishedArticles } from "@/lib/articles";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { getPublicServiceRowBySlug } from "@/lib/services";
import {
  ARTICLE_TOPICS,
  CM_YUVA_PRICE,
  CM_YUVA_SUPPORT_PHONE,
  COMPLIANCE_NOTE,
  FAQS,
} from "@/lib/cm-yuva/content";

/**
 * The CM YUVA landing page, rendered for whichever slug asked for it.
 *
 * There are two CM YUVA services on this site: `cm-yuva-loan`, the row an
 * administrator created and which the services directory links to, and
 * `cm-yuva-entrepreneur-loan-assistance`, the older slug the navigation menu,
 * the coupon, the search synonyms and the application form's special handling
 * are all wired to. Customers reach the first one; the machinery is attached
 * to the second.
 *
 * Rather than pick one and silently break the other, this component serves
 * both, and takes the price and title from whichever service row was asked
 * for. Nothing about the fee is hardcoded here: each URL shows the amount that
 * URL's own service actually charges.
 */

const SITE_URL = "https://www.rnos.in";

const DESCRIPTION =
  "CM YUVA entrepreneur loan filing help for Uttar Pradesh: project report, MSME registration, document checks and portal submission. Up to ₹10 lakh with interest subvention and ₹50,000 margin money subsidy.";

/** What this service charges, read from its own row rather than assumed. */
async function loadService(slug: string) {
  const row = await getPublicServiceRowBySlug(slug);

  const price =
    Number(row?.offer_price ?? row?.sale_price ?? 0) > 0
      ? Number(row?.offer_price ?? row?.sale_price)
      : CM_YUVA_PRICE;

  return { row, price };
}

export async function buildCmYuvaMetadata(slug: string): Promise<Metadata> {
  const { row } = await loadService(slug);
  const title = row?.seo_title || "CM YUVA Loan Assistance (UP) | DigiConnect Dukan";
  const description = row?.seo_description || DESCRIPTION;
  const path = `/services/${slug}`;

  return {
    title,
    description,
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
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
      images: [
        {
          url: "/images/services/yuva/hero-banner.jpg",
          alt: "CM YUVA entrepreneur loan assistance — DigiConnect Dukan",
        },
      ],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Structured data.
 *
 * A Service, the FAQ, and the breadcrumb — and deliberately no
 * `aggregateRating`. The service row carries reviews but no scores, so any
 * rating published here would be one nobody gave. The `termsOfService` note
 * carries the same disclaimer the page prints: approval is the bank's.
 */
function buildSchemas(slug: string, price: number, title: string) {
  const path = `/services/${slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: title,
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
        price,
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
        { "@type": "ListItem", position: 3, name: title, item: `${SITE_URL}${path}` },
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
      // `keywords` is typed as an array but comes straight out of the row, so
      // it can be a string on a text column. Joining a string throws.
      const keywords = Array.isArray(article.keywords) ? article.keywords.join(" ") : "";
      const haystack = `${article.category ?? ""} ${article.title} ${keywords}`.toLowerCase();
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

export async function CmYuvaPage({ slug }: { slug: string }) {
  const [user, service, articles, socialLinks] = await Promise.all([
    getCurrentUser(),
    loadService(slug),
    getPublishedArticles(),
    getCachedFooterSocialLinks(),
  ]);

  const { row, price } = service;
  const title = row?.title || "CM YUVA Entrepreneur Loan Assistance";

  /*
    Reviews come from the service row an administrator maintains. There is no
    seeded list behind this: with none entered the band does not render.

    `normalizeServiceRow` casts this column rather than checking it, so what
    arrives here is whatever the database holds — an array on a jsonb column, a
    string on a text one, null when unset. Calling .filter on a string throws,
    and it throws during the server render, which takes the whole page down
    with it.
  */
  const rawReviews = row?.reviews;
  const reviews: CmYuvaReview[] = (Array.isArray(rawReviews) ? rawReviews : [])
    .filter((review) => review?.name && review?.text)
    .map((review) => ({
      name: String(review.name),
      location: review.location ? String(review.location) : null,
      text: String(review.text),
    }));

  return (
    <>
      <main id="main-content" className="homepage-mobile-shell home-option3 min-h-screen bg-white">
        <CmYuvaClient
          slug={slug}
          price={price}
          isLoggedIn={Boolean(user)}
          articles={pickArticles(articles)}
          reviews={reviews}
        />
      </main>

      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />

      {buildSchemas(slug, price, title).map((schema, index) => (
        <script
          key={`cm-yuva-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
