import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { DynamicServicePage } from "@/components/services/dynamic-service-page";
import { getPublicCategoryBySlug, getPublicServiceBySlug, getPublicServiceRowBySlug, getPublicServicesByCategory, rowFromFallback } from "@/lib/services";
import { serviceFromDb } from "@/lib/services";
import { type ServiceItem } from "@/lib/services-data";
import { getCurrentUser } from "@/lib/auth";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const dynamic = "force-dynamic";

// generateStaticParams removed because force-dynamic conflicts with it when query params exist

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (category) {
    return {
      title: `${category.title} | DigiConnect Dukan`,
      description: category.description,
      alternates: { canonical: `/services/${category.slug}` },
    };
  }

  const row = await getPublicServiceRowBySlug(slug);
  const service = row ? serviceFromDb(row) : await getPublicServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found | DigiConnect Dukan",
    };
  }

  return {
    title: service.seoTitle,
    description: service.seoDescription,
    keywords: service.seoKeywords,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title: service.seoTitle,
      description: service.seoDescription,
      type: "article",
      url: `/services/${service.slug}`,
      images: row?.hero_image_url ? [{ url: row.hero_image_url, alt: service.title }] : undefined,
    },
  };
}

function buildSchemas(service: ServiceItem) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "DigiConnect Dukan",
      legalName: "RNOS India Pvt Ltd",
      telephone: "+91 7007595931",
      areaServed: "IN",
      priceRange: service.priceLabel,
      url: "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.title,
      description: service.seoDescription,
      provider: {
        "@type": "LocalBusiness",
        name: "DigiConnect Dukan",
      },
      serviceType: service.category,
      areaServed: "India",
      offers: {
        "@type": "Offer",
        price: service.amount || undefined,
        priceCurrency: service.amount ? "INR" : undefined,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}


export default async function ServiceDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);

  // Read searchParams (e.g., ref) so Next.js treats this page as fully dynamic without caching issues
  await searchParams;

  if (slug === "cibil-credit-score-guidance") {
    redirect("/services/cibil-report-analysis-and-credit-health-consultation");
  }

  const categoryPage = await getPublicCategoryBySlug(slug);

  if (categoryPage) {
    const services = await getPublicServicesByCategory(categoryPage.slug);
    return <CategoryServicesPage category={categoryPage} services={services} />;
  }

  const row = await getPublicServiceRowBySlug(slug);

  if (row) {
    const service = serviceFromDb(row);
    return (
      <>
        <DynamicServicePage row={row} isLoggedIn={Boolean(user)} />
        {buildSchemas(service).map((schema, index) => (
          <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </>
    );
  }

  const fallback = await getPublicServiceBySlug(slug);
  if (!fallback) notFound();

  const fallbackRow = rowFromFallback(fallback);
  return (
    <>
      <DynamicServicePage row={fallbackRow} isLoggedIn={Boolean(user)} />
      {buildSchemas(fallback).map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}
