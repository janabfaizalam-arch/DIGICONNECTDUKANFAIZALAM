"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { AIServiceHelper } from "@/components/services/ai-service-helper";
import {
  ServiceHeroSection,
  ServiceQuickFacts,
  ServiceTrustBar,
} from "@/components/services/detail/sections-intro";
import {
  ServiceBenefitsSection,
  ServiceDocumentsSection,
  ServiceEligibilitySection,
  ServiceHowItWorksSection,
  ServiceOverviewSection,
  ServiceWhoIsItForSection,
  ServiceWhyUsSection,
} from "@/components/services/detail/sections-explain";
import {
  ServiceComparisonSection,
  ServiceDisclaimerSection,
  ServiceFinalCtaSection,
  ServicePricingSection,
} from "@/components/services/detail/sections-offer";
import {
  ServicePhotosSection,
  ServiceRatingSection,
  ServiceReviewsSection,
  ServiceSuccessStoriesSection,
  ServiceVideosSection,
} from "@/components/services/detail/sections-proof";
import {
  ServiceFaqSection,
  ServiceImportantInfoSection,
  ServiceRelatedBlogsSection,
  ServiceRelatedServicesSection,
} from "@/components/services/detail/sections-more";
import { safeCurrency } from "@/lib/admin-format";
import { serviceFromDb, type DbService, type DbServiceVariant } from "@/lib/services";
import type { ServiceItem } from "@/lib/services-data";
import {
  buildServiceDetail,
  SERVICE_PAGE_BLUEPRINT,
  type ServiceBlogCard,
  type ServiceLinkCard,
} from "@/lib/services/detail-blueprint";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl, isCibilOrFinanceService } from "@/lib/whatsapp";

/** The desk that answers credit questions, which is not the general desk. */
const CIBIL_DESK = "918287002983";

/**
 * A service page.
 *
 * Every service without a page of its own renders through here, and every one
 * of them renders the same twenty-three bands in the same order — the order in
 * `SERVICE_PAGE_BLUEPRINT`, which is the single place that order is decided.
 * A band whose slot has no content is skipped rather than shown empty, so two
 * services differ in how much of the page they fill and never in how it is
 * laid out.
 *
 * Everything animates through `MotionRoot`, the site's LazyMotion boundary, so
 * this page shares the `domAnimation` bundle the homepage already loads rather
 * than pulling in the full library. `strict` is on there, which is why every
 * animated element in these sections is `m.*` and never `motion.*`.
 */
export function ServiceDetailPage({
  row,
  isLoggedIn = false,
  blogs = [],
  related = [],
}: {
  row: DbService;
  isLoggedIn?: boolean;
  /* Both arrive already narrowed to plain data. A `ServiceItem` carries its
     Lucide icon as a component, and one of those crossing this boundary fails
     serialization and renders an empty page under a 200. */
  blogs?: ServiceBlogCard[];
  related?: ServiceLinkCard[];
}) {
  const [selectedVariant, setSelectedVariant] = useState<DbServiceVariant | null>(
    () => row.service_variants?.[0] ?? null,
  );

  useEffect(() => {
    setSelectedVariant(row.service_variants?.[0] ?? null);
  }, [row]);

  /* A view is a fact about the page, not about the visitor: slug only. */
  useEffect(() => {
    fetch("/api/services/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_slug: row.slug, click_type: "view" }),
    }).catch(() => {
      /* Analytics must never be the reason a page misbehaves. */
    });
  }, [row.slug]);

  const detail = useMemo(() => {
    const base = serviceFromDb(row);

    /* The chosen plan overrides price and documents; everything else is the
       service's own. */
    const service: ServiceItem = selectedVariant
      ? {
          ...base,
          oldPrice: selectedVariant.original_price ? safeCurrency(selectedVariant.original_price) : base.oldPrice,
          offerPrice: selectedVariant.offer_price ? safeCurrency(selectedVariant.offer_price) : base.offerPrice,
          amount: selectedVariant.offer_price || selectedVariant.selling_price || base.amount,
          priceLabel: selectedVariant.name,
          documents: selectedVariant.required_documents?.length
            ? selectedVariant.required_documents.map((doc) => doc.name)
            : base.documents,
        }
      : base;

    const applyHref = selectedVariant
      ? `/apply/${service.slug}?variant=${selectedVariant.slug}`
      : `/apply/${service.slug}`;

    return buildServiceDetail({
      row,
      service,
      blogs,
      related,
      applyHref: isLoggedIn ? applyHref : `/login/customer?redirect=${encodeURIComponent(applyHref)}`,
      whatsappHref: buildWhatsAppUrl(
        buildServiceWhatsAppMessage({
          serviceName: service.title,
          category: service.category,
          action: service.ctaType === "apply" ? "apply" : "enquiry",
          page: `/services/${service.slug}`,
        }),
        isCibilOrFinanceService(service.slug, service.title) ? CIBIL_DESK : undefined,
      ),
    });
  }, [row, selectedVariant, blogs, related, isLoggedIn]);

  /**
   * One entry per blueprint slot, in blueprint order.
   *
   * Keyed by slot name rather than by position so the map cannot silently
   * drift out of the order the blueprint declares — the contract test walks
   * this list against `SERVICE_PAGE_BLUEPRINT` and fails if they disagree.
   */
  const bands: Record<(typeof SERVICE_PAGE_BLUEPRINT)[number], ReactNode> = {
    hero: <ServiceHeroSection detail={detail} isLoggedIn={isLoggedIn} />,
    trustBar: <ServiceTrustBar />,
    quickFacts: <ServiceQuickFacts detail={detail} />,
    overview: <ServiceOverviewSection detail={detail} />,
    whoIsItFor: <ServiceWhoIsItForSection detail={detail} />,
    benefits: <ServiceBenefitsSection detail={detail} />,
    whyUs: <ServiceWhyUsSection />,
    howItWorks: <ServiceHowItWorksSection detail={detail} />,
    eligibility: <ServiceEligibilitySection detail={detail} />,
    documents: <ServiceDocumentsSection detail={detail} />,
    pricing: (
      <ServicePricingSection
        detail={detail}
        isLoggedIn={isLoggedIn}
        selectedVariant={selectedVariant}
        onSelectVariant={setSelectedVariant}
      />
    ),
    comparison: <ServiceComparisonSection detail={detail} />,
    reviews: <ServiceReviewsSection detail={detail} />,
    stats: <ServiceRatingSection detail={detail} />,
    photos: <ServicePhotosSection detail={detail} />,
    videos: <ServiceVideosSection detail={detail} />,
    successStories: <ServiceSuccessStoriesSection detail={detail} />,
    importantInfo: <ServiceImportantInfoSection detail={detail} />,
    faqs: <ServiceFaqSection detail={detail} />,
    relatedBlogs: <ServiceRelatedBlogsSection detail={detail} />,
    relatedServices: <ServiceRelatedServicesSection detail={detail} />,
    finalCta: <ServiceFinalCtaSection detail={detail} isLoggedIn={isLoggedIn} />,
    disclaimer: <ServiceDisclaimerSection detail={detail} />,
  };

  return (
    <MotionRoot>
      <div className="bg-white text-[var(--dc-ink)]">
        {SERVICE_PAGE_BLUEPRINT.map((slot, index) =>
          /* The first two bands are on screen before anything could reveal. */
          index < 2 ? (
            <div key={slot}>{bands[slot]}</div>
          ) : (
            <Reveal key={slot}>{bands[slot]}</Reveal>
          ),
        )}

        <AIServiceHelper service={row} />
      </div>
    </MotionRoot>
  );
}