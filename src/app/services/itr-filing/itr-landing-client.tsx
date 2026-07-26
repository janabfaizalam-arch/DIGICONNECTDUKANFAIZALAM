"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { ITR_APPLY_PATH } from "@/lib/itr/constants";
import type { ItrCmsPayload, ItrSection } from "@/lib/itr/types";
import {
  ItrBenefitsSection,
  ItrDocumentsSection,
  ItrFormComparisonSection,
  ItrIncomeSourcesSection,
  ItrMistakesSection,
  ItrProcessSection,
  ItrTrustUsSection,
  ItrWhoShouldFileSection,
  ItrWhyUsSection,
} from "@/components/services/itr/sections-core";
import {
  ItrCtaSection,
  ItrFaqSection,
  ItrPricingSection,
  ItrRelatedSection,
  ItrReviewsSection,
  ItrSelfVsExpertSection,
} from "@/components/services/itr/sections-convert";
import {
  ItrHeroSection,
  ItrTrustSection,
  ItrWhatIsSection,
} from "@/components/services/itr/sections-intro";
import { ItrFloatingWhatsApp, ItrStickyCta } from "@/components/services/itr/sticky-cta";
import type { ItrSectionContext } from "@/components/services/itr/shared";

type Props = {
  isLoggedIn: boolean;
  cms: ItrCmsPayload;
};

function filterBanners(cms: ItrCmsPayload, sectionKey: string) {
  return cms.banners
    .filter((b) => b.isActive && b.sectionKey === sectionKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function ItrLandingClient({ isLoggedIn, cms }: Props) {
  const reduceMotion = Boolean(useReducedMotion());
  const { settings } = cms;

  const applyUrl = isLoggedIn
    ? ITR_APPLY_PATH
    : `/login/customer?redirect=${encodeURIComponent(ITR_APPLY_PATH)}`;

  const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
    "Hi, I am interested in Income Tax Return (ITR) filing services. Please guide me.",
  )}`;

  const ctx: ItrSectionContext = useMemo(
    () => ({
      applyUrl,
      whatsappUrl,
      supportPhone: settings.supportPhone,
      reduceMotion,
      assessmentYear: settings.assessmentYear,
      startingPrice: settings.startingPrice,
      pricingDisclaimer: settings.pricingDisclaimer,
      finalQuoteDisclaimer: settings.finalQuoteDisclaimer,
      taxLiabilityDisclaimer: settings.taxLiabilityDisclaimer,
      refundDisclaimer: settings.refundDisclaimer,
    }),
    [
      applyUrl,
      whatsappUrl,
      settings.supportPhone,
      settings.assessmentYear,
      settings.startingPrice,
      settings.pricingDisclaimer,
      settings.finalQuoteDisclaimer,
      settings.taxLiabilityDisclaimer,
      settings.refundDisclaimer,
      reduceMotion,
    ],
  );

  const enabledSections = cms.sections
    .filter((s) => s.enabled && s.sectionKey !== "sticky_cta")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const stickySection = cms.sections.find((s) => s.sectionKey === "sticky_cta");
  const showSticky =
    settings.stickyCtaEnabled && (stickySection?.enabled ?? true) && Boolean(stickySection);

  const renderSection = (section: ItrSection) => {
    const banners = filterBanners(cms, section.sectionKey);
    const key = section.id || section.sectionKey;

    switch (section.sectionKey) {
      case "hero":
        return (
          <ItrHeroSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            settings={settings}
          />
        );
      case "trust":
        return <ItrTrustSection key={key} section={section} />;
      case "what_is":
        return <ItrWhatIsSection key={key} section={section} banners={banners} />;
      case "who_should_file":
        return <ItrWhoShouldFileSection key={key} section={section} banners={banners} />;
      case "income_sources":
        return <ItrIncomeSourcesSection key={key} section={section} banners={banners} />;
      case "form_comparison":
        return (
          <ItrFormComparisonSection
            key={key}
            section={section}
            banners={banners}
            rows={cms.comparison}
            ctx={ctx}
          />
        );
      case "benefits":
        return <ItrBenefitsSection key={key} section={section} banners={banners} />;
      case "documents":
        return (
          <ItrDocumentsSection
            key={key}
            section={section}
            banners={banners}
            documents={cms.documents}
          />
        );
      case "process":
        return <ItrProcessSection key={key} section={section} banners={banners} />;
      case "pricing":
        return (
          <ItrPricingSection
            key={key}
            section={section}
            ctx={ctx}
            banners={banners}
            plans={cms.pricing}
          />
        );
      case "self_vs_expert":
        return (
          <ItrSelfVsExpertSection
            key={key}
            section={section}
            banners={banners}
            rows={cms.comparison}
          />
        );
      case "why_us":
        return <ItrWhyUsSection key={key} section={section} banners={banners} />;
      case "mistakes":
        return <ItrMistakesSection key={key} section={section} banners={banners} />;
      case "reviews":
        return (
          <ItrReviewsSection
            key={key}
            section={section}
            banners={banners}
            reviews={cms.reviews}
          />
        );
      case "trust_us":
        return <ItrTrustUsSection key={key} section={section} banners={banners} />;
      case "faq":
        return (
          <ItrFaqSection key={key} section={section} banners={banners} faqs={cms.faqs} />
        );
      case "related":
        return (
          <ItrRelatedSection
            key={key}
            section={section}
            banners={banners}
            related={cms.related}
          />
        );
      case "cta":
        return <ItrCtaSection key={key} section={section} ctx={ctx} banners={banners} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
      {enabledSections.map(renderSection)}

      {showSticky && stickySection && <ItrStickyCta section={stickySection} ctx={ctx} />}

      <ItrFloatingWhatsApp whatsappUrl={whatsappUrl} />

      {showSticky && <div className="h-20 md:hidden" aria-hidden />}
    </div>
  );
}
