import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { DynamicServicePage } from "@/components/services/dynamic-service-page";
import { getPublicCategoryBySlug, getPublicServiceBySlug, getPublicServiceRowBySlug, getPublicServicesByCategory } from "@/lib/services";
import { serviceFromDb, type DbService } from "@/lib/services";
import { servicesData, type ServiceItem } from "@/lib/services-data";
import { getCurrentUser } from "@/lib/auth";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return servicesData.map((service) => ({
    slug: service.slug,
  }));
}

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

function rowFromFallback(service: ServiceItem): DbService {
  return {
    id: service.slug,
    category_id: null,
    category: service.categorySlug,
    title: service.title,
    slug: service.slug,
    short_description: service.shortDescription,
    full_description: service.overview,
    overview: service.overview,
    benefits: service.benefits,
    documents: service.documents,
    process: service.process,
    base_price: service.oldPrice ? Number(service.oldPrice.replace(/[^\d]/g, "")) : service.amount,
    sale_price: service.amount,
    is_paid: service.ctaType === "apply" && service.amount > 0,
    is_featured: false,
    show_on_homepage: false,
    is_active: true,
    old_price: service.oldPrice ? Number(service.oldPrice.replace(/[^\d]/g, "")) : null,
    offer_price: service.amount,
    price_label: service.priceLabel,
    cta_type: service.ctaType,
    badge: service.badge ?? null,
    icon: "FileText",
    hero_image_url: null,
    hero_image_storage_path: null,
    cta_primary_label: service.ctaType === "apply" ? "Apply Now" : "Enquiry Now",
    cta_primary_url: service.ctaType === "apply" ? `/apply/${service.slug}` : null,
    cta_secondary_label: "WhatsApp",
    cta_secondary_url: null,
    status: "published",
    featured: false,
    sort_order: 0,
    seo_title: service.seoTitle,
    seo_description: service.seoDescription,
    seo_keywords: service.seoKeywords,
    blog_content: service.blogContent,
    faqs: service.faqs,
    reviews: service.reviews,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    service_categories: {
      id: service.categorySlug,
      name: service.category,
      slug: service.categorySlug,
      description: null,
      sort_order: 0,
      is_active: true,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);

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
