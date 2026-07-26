import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getItrCmsPayload } from "@/lib/itr/cms";
import { ITR_LANDING_PATH } from "@/lib/itr/constants";
import ItrLandingClient from "./itr-landing-client";

export const dynamic = "force-dynamic";

const SITE_URL = "https://www.rnos.in";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getItrCmsPayload();
  const { settings } = cms;
  const title =
    settings.metaTitle || "Income Tax Return Filing Online | DigiConnect Dukan";
  const description =
    settings.metaDescription ||
    "Expert-assisted ITR filing for salaried, business, capital gains and freelancers. Transparent packages with DigiConnect Dukan.";

  const keywords = settings.metaKeywords
    ? settings.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [
        "ITR filing online",
        "Income Tax Return filing",
        "ITR filing service",
        "freelancer ITR",
        "capital gains ITR",
      ];

  return {
    title,
    description,
    keywords,
    robots: settings.robotsIndex ? undefined : { index: false, follow: false },
    alternates: {
      canonical: ITR_LANDING_PATH,
    },
    openGraph: {
      title: settings.ogTitle || title,
      description: settings.ogDescription || description,
      type: "website",
      url: ITR_LANDING_PATH,
      images: settings.ogImageUrl
        ? [{ url: settings.ogImageUrl, alt: "ITR Filing — DigiConnect Dukan" }]
        : [{ url: "/icon.png", width: 512, height: 512, alt: "ITR Filing — DigiConnect Dukan" }],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.ogTitle || title,
      description: settings.ogDescription || description,
      images: settings.twitterImageUrl ? [settings.twitterImageUrl] : undefined,
    },
  };
}

function buildSchemas(cms: Awaited<ReturnType<typeof getItrCmsPayload>>) {
  const activeFaqs = cms.faqs.filter((f) => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeReviews = cms.reviews
    .filter((r) => r.isActive && !r.isDemo)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const featuredPlan =
    cms.pricing.find((p) => p.planKey === cms.settings.defaultPlanId) ??
    cms.pricing.find((p) => p.isFeatured) ??
    cms.pricing[0];
  const price = featuredPlan?.price ?? cms.settings.startingPrice;

  const schemas: Record<string, unknown>[] = [
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
      name: cms.settings.serviceName,
      description: cms.settings.metaDescription,
      provider: {
        "@type": "Organization",
        name: "DigiConnect Dukan",
      },
      serviceType: "Tax Filing & Compliance",
      areaServed: "India",
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
          name: cms.settings.shortName,
          item: `${SITE_URL}${ITR_LANDING_PATH}`,
        },
      ],
    },
  ];

  if (activeReviews.length > 0) {
    schemas.push(
      ...activeReviews.slice(0, 5).map((review) => ({
        "@context": "https://schema.org",
        "@type": "Review",
        itemReviewed: {
          "@type": "Service",
          name: cms.settings.serviceName,
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
    );
  }

  return schemas;
}

export default async function ItrFilingPage() {
  const [user, cms] = await Promise.all([getCurrentUser(), getItrCmsPayload()]);

  return (
    <>
      <main className="min-h-screen">
        <ItrLandingClient isLoggedIn={Boolean(user)} cms={cms} />
      </main>

      {buildSchemas(cms).map((schema, index) => (
        <script
          key={`itr-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
