import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getDprCmsPayload } from "@/lib/dpr/cms";
import { DPR_LANDING_PATH, DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
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
  const ratingValues = activeReviews.map((r) => r.rating);
  const avgRating =
    ratingValues.length > 0
      ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1))
      : 4.9;

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
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: activeReviews.length || 3,
        bestRating: 5,
        worstRating: 1,
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

export default async function DetailedProjectReportPage() {
  const [user, cms] = await Promise.all([getCurrentUser(), getDprCmsPayload()]);

  return (
    <>
      <main className="min-h-screen">
        <DprLandingClient isLoggedIn={Boolean(user)} cms={cms} />
      </main>

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
