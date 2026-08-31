import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { ServiceDetailPage } from "@/components/services/detail/service-detail-page";
import { getPublishedArticles } from "@/lib/articles";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { pickRelatedArticles, toServiceLinkCards } from "@/lib/services/detail-blueprint";
import { getPublicCategoryBySlug, getPublicServiceBySlug, getPublicServiceRowBySlug, getPublicServicesByCategory, rowFromFallback } from "@/lib/services";
import { serviceFromDb, type DbService } from "@/lib/services";
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


/**
 * Everything the page needs that is not the service row itself.
 *
 * Fetched in parallel, and each one degrading to nothing rather than throwing:
 * a service page must still render when the articles table is unreachable.
 */
async function loadPageExtras(service: ServiceItem) {
  const [articles, siblings, socialLinks] = await Promise.all([
    getPublishedArticles().catch(() => []),
    getPublicServicesByCategory(service.categorySlug).catch(() => [] as ServiceItem[]),
    getCachedFooterSocialLinks().catch(() => undefined),
  ]);

  // Narrowed here, not in the client component: a ServiceItem carries its
  // Lucide icon as a React component, and handing one to a client component
  // fails serialization and renders an empty page under a 200.
  return {
    blogs: pickRelatedArticles(articles, service),
    related: toServiceLinkCards(siblings, service.slug),
    socialLinks,
  };
}

async function renderService(row: DbService, service: ServiceItem, isLoggedIn: boolean) {
  const { blogs, related, socialLinks } = await loadPageExtras(service);

  return (
    <>
      <main id="main-content" className="homepage-mobile-shell home-option3 min-h-screen bg-white">
        <ServiceDetailPage row={row} isLoggedIn={isLoggedIn} blogs={blogs} related={related} />
      </main>

      <MarketingFooter socialLinks={socialLinks} />
      <HomepageContactActions desktopOnly />

      {buildSchemas(service).map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </>
  );
}

export default async function ServiceDetailRoute({ params, searchParams }: PageProps) {
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
  if (row) return renderService(row, serviceFromDb(row), Boolean(user));

  const fallback = await getPublicServiceBySlug(slug);
  if (!fallback) notFound();

  return renderService(rowFromFallback(fallback), fallback, Boolean(user));
}
