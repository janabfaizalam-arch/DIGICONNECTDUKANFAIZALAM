"use client";

import { useMemo } from "react";

import { MotionRoot, Reveal } from "@/components/homepage/motion";
import {
  CmYuvaAbout,
  CmYuvaArticles,
  CmYuvaCta,
  CmYuvaComparison,
  CmYuvaContact,
  CmYuvaDocuments,
  CmYuvaEligibility,
  CmYuvaFaq,
  CmYuvaHero,
  CmYuvaPricing,
  CmYuvaProcess,
  CmYuvaRejections,
  CmYuvaRelated,
  CmYuvaReviews,
  CmYuvaSectors,
  CmYuvaStats,
  CmYuvaTrust,
  CmYuvaTrustBadges,
  CmYuvaTrustRail,
  CmYuvaWhatWeDo,
  type CmYuvaArticle,
  type CmYuvaCtx,
  type CmYuvaReview,
} from "@/components/services/cm-yuva/sections";
import { CmYuvaStickyCta } from "@/components/services/cm-yuva/sticky-cta";
import {
  CM_YUVA_APPLY_PATH,
  CM_YUVA_IMAGES,
  CM_YUVA_PRICE,
  CM_YUVA_SUPPORT_PHONE,
  CM_YUVA_WHATSAPP_NUMBER,
  SCHEME_TERMS,
} from "@/lib/cm-yuva/content";

/**
 * The CM YUVA landing page.
 *
 * Everything animates through `MotionRoot`, the site's LazyMotion boundary, so
 * this page uses the same `domAnimation` bundle the homepage and the services
 * directory already load rather than pulling in the full library for itself.
 * `strict` is on there, which is why every animated element in these sections
 * is `m.*` and never `motion.*`.
 *
 * The first two bands render directly — they are on screen before anything can
 * reveal — and the rest fade up as they are reached.
 */
export default function CmYuvaClient({
  isLoggedIn,
  articles,
  reviews,
}: {
  isLoggedIn: boolean;
  articles: CmYuvaArticle[];
  reviews: CmYuvaReview[];
}) {
  const ctx: CmYuvaCtx = useMemo(
    () => ({
      applyUrl: isLoggedIn
        ? CM_YUVA_APPLY_PATH
        : `/login/customer?redirect=${encodeURIComponent(CM_YUVA_APPLY_PATH)}`,
      whatsappUrl: `https://wa.me/${CM_YUVA_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hi, I want to apply for the CM YUVA entrepreneur loan. Please guide me.",
      )}`,
      supportPhone: CM_YUVA_SUPPORT_PHONE,
    }),
    [isLoggedIn],
  );

  return (
    <MotionRoot>
      <div className="bg-white text-[var(--dc-ink)]">
        <CmYuvaHero
          ctx={ctx}
          terms={SCHEME_TERMS}
          logo={CM_YUVA_IMAGES.logo}
          poster={CM_YUVA_IMAGES.hero}
        />
        <CmYuvaTrustRail />

        <Reveal>
          <CmYuvaAbout
            terms={SCHEME_TERMS}
            posters={{ interestFree: CM_YUVA_IMAGES.interestFree, subsidy: CM_YUVA_IMAGES.subsidy }}
          />
        </Reveal>
        <Reveal>
          <CmYuvaEligibility ctx={ctx} />
        </Reveal>
        <Reveal>
          <CmYuvaSectors />
        </Reveal>
        <Reveal>
          <CmYuvaWhatWeDo />
        </Reveal>
        <Reveal>
          <CmYuvaDocuments />
        </Reveal>
        <Reveal>
          <CmYuvaProcess />
        </Reveal>
        <Reveal>
          <CmYuvaRejections />
        </Reveal>
        <Reveal>
          <CmYuvaPricing ctx={ctx} price={CM_YUVA_PRICE} />
        </Reveal>
        <Reveal>
          <CmYuvaComparison />
        </Reveal>
        <Reveal>
          <CmYuvaTrust />
        </Reveal>
        <Reveal>
          <CmYuvaReviews reviews={reviews} />
        </Reveal>
        <Reveal>
          <CmYuvaStats />
        </Reveal>
        <Reveal>
          <CmYuvaArticles articles={articles} />
        </Reveal>
        <Reveal>
          <CmYuvaFaq />
        </Reveal>
        <Reveal>
          <CmYuvaTrustBadges />
        </Reveal>
        <Reveal>
          <CmYuvaCta ctx={ctx} price={CM_YUVA_PRICE} />
        </Reveal>
        <Reveal>
          <CmYuvaRelated />
        </Reveal>
        <Reveal>
          <CmYuvaContact ctx={ctx} />
        </Reveal>

        <CmYuvaStickyCta ctx={ctx} price={CM_YUVA_PRICE} />

        {/* Room for the apply bar, which sits above the tab bar on a phone. */}
        <div className="h-16 md:hidden" aria-hidden="true" />
      </div>
    </MotionRoot>
  );
}
