"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { DPR_APPLY_PATH, DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import { DPR_SUCCESS_STORIES } from "@/lib/dpr/defaults";
import type { DprArticleCard, DprCmsPayload, DprSection } from "@/lib/dpr/types";
import {
  DprBenefitsSection,
  DprDocumentsSection,
  DprIncludesSection,
  DprSchemesSection,
  DprStatsSection,
  DprTrustBadgesSection,
  DprWhyUsSection,
} from "@/components/services/dpr/sections-core";
import {
  DprArticlesSection,
  DprComparisonSection,
  DprContactSection,
  DprCtaSection,
  DprFaqSection,
  DprPricingSection,
  DprProcessSection,
  DprRelatedSection,
  DprReviewsSection,
  DprSamplesSection,
  DprSuccessSection,
} from "@/components/services/dpr/sections-convert";
import {
  DprHeroSection,
  DprTrustSection,
  DprVideoSection,
  DprWhatIsSection,
} from "@/components/services/dpr/sections-intro";
import { DprStickyCta } from "@/components/services/dpr/sticky-cta";
import type { DprSectionContext } from "@/components/services/dpr/shared";

type Props = {
  isLoggedIn: boolean;
  cms: DprCmsPayload;
  articles: DprArticleCard[];
};

function filterBanners(cms: DprCmsPayload, sectionKey: string) {
  return cms.banners
    .filter((b) => b.isActive && b.sectionKey === sectionKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The DPR landing page.
 *
 * Order, headings, copy, images and which bands appear at all are the
 * administrator's, read from the DPR CMS; this file only decides which
 * component renders a given key and hands it its slice of the payload.
 *
 * Everything is wrapped in `MotionRoot`, the site's LazyMotion boundary, so
 * this page animates through the same `domAnimation` bundle the homepage and
 * services directory already load rather than pulling in the full library for
 * itself. `strict` is on there, which is why every animated element in these
 * sections is `m.*` and never `motion.*`.
 */
export default function DprLandingClient({ isLoggedIn, cms, articles }: Props) {
  const reduceMotion = Boolean(useReducedMotion());
  const { settings } = cms;

  const applyUrl = isLoggedIn
    ? DPR_APPLY_PATH
    : `/login/customer?redirect=${encodeURIComponent(DPR_APPLY_PATH)}`;

  const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    "Hi, I am interested in a Detailed Project Report (DPR). Please guide me.",
  )}`;

  const ctx: DprSectionContext = useMemo(
    () => ({ applyUrl, whatsappUrl, supportPhone: settings.supportPhone, reduceMotion }),
    [applyUrl, whatsappUrl, settings.supportPhone, reduceMotion],
  );

  const enabledSections = cms.sections
    .filter((s) => s.enabled && s.sectionKey !== "sticky_cta")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const stickySection = cms.sections.find((s) => s.sectionKey === "sticky_cta");
  const showSticky =
    settings.stickyCtaEnabled && (stickySection?.enabled ?? true) && Boolean(stickySection);

  const launchPrice =
    cms.pricing.find((p) => p.planKey === settings.defaultPlanId)?.price ??
    cms.pricing.find((p) => p.isFeatured)?.price ??
    DPR_LAUNCH_PRICE;

  const renderSection = (section: DprSection) => {
    const banners = filterBanners(cms, section.sectionKey);
    const key = section.id || section.sectionKey;

    switch (section.sectionKey) {
      case "hero":
        return (
          <DprHeroSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            launchPrice={launchPrice}
          />
        );
      case "trust":
        return <DprTrustSection key={key} section={section} />;
      case "what_is":
        return <DprWhatIsSection key={key} section={section} banners={banners} />;
      case "video":
        return (
          <DprVideoSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            videoUrl={settings.videoUrl}
          />
        );
      case "why_us":
        return <DprWhyUsSection key={key} section={section} banners={banners} />;
      case "schemes":
        return <DprSchemesSection key={key} section={section} banners={banners} />;
      case "includes":
        return <DprIncludesSection key={key} section={section} banners={banners} />;
      case "pricing":
        return (
          <DprPricingSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            plans={cms.pricing}
          />
        );
      case "comparison":
        return (
          <DprComparisonSection key={key} section={section} banners={banners} rows={cms.comparison} />
        );
      case "process":
        return <DprProcessSection key={key} section={section} banners={banners} />;
      case "samples":
        return <DprSamplesSection key={key} section={section} banners={banners} />;
      case "reviews":
        return (
          <DprReviewsSection key={key} section={section} banners={banners} reviews={cms.reviews} />
        );
      case "success":
        return (
          <DprSuccessSection
            key={key}
            section={section}
            banners={banners}
            stories={DPR_SUCCESS_STORIES}
          />
        );
      case "articles":
        return (
          <DprArticlesSection key={key} section={section} banners={banners} articles={articles} />
        );
      case "faq":
        return <DprFaqSection key={key} section={section} banners={banners} faqs={cms.faqs} />;
      case "trust_badges":
        return <DprTrustBadgesSection key={key} section={section} banners={banners} />;
      case "documents":
        return <DprDocumentsSection key={key} section={section} banners={banners} />;
      case "benefits":
        return <DprBenefitsSection key={key} section={section} banners={banners} />;
      case "stats":
        return <DprStatsSection key={key} section={section} banners={banners} />;
      case "cta":
        return (
          <DprCtaSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            launchPrice={launchPrice}
          />
        );
      case "related":
        return (
          <DprRelatedSection key={key} section={section} banners={banners} related={cms.related} />
        );
      case "contact":
        return <DprContactSection key={key} section={section} ctx={ctx} banners={banners} />;
      default:
        return null;
    }
  };

  return (
    <MotionRoot>
      <div className="bg-white text-[var(--dc-ink)]">
        {enabledSections.map((section, index) =>
          // The first two bands are on screen before anything can reveal, so
          // they are rendered directly; the rest fade up as they are reached.
          index < 2 ? (
            renderSection(section)
          ) : (
            <Reveal key={section.id || section.sectionKey}>{renderSection(section)}</Reveal>
          ),
        )}

        {showSticky && stickySection ? (
          <DprStickyCta section={stickySection} ctx={ctx} launchPrice={launchPrice} />
        ) : null}

        {/* Room for the apply bar, which sits above the tab bar on a phone. */}
        {showSticky ? <div className="h-16 md:hidden" aria-hidden="true" /> : null}
      </div>
    </MotionRoot>
  );
}
