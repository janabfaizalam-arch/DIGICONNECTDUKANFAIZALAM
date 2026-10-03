"use client";

import { useEffect } from "react";

import { MotionRoot } from "@/components/homepage/motion";
import { PASSPORT_SLUG } from "@/lib/passport/content";
import { PassportDocumentChecklist, PassportPhotoGuide } from "./passport-documents";
import { PassportFAQ, PassportFinalCTA, PassportStickyCTA, PassportTravelStory } from "./passport-finale";
import { PassportAppointment, PassportApplication, PassportFamily, PassportSecurity } from "./passport-guidance";
import { PassportHero, PassportPriceDock } from "./passport-hero";
import { PassportJourney, PassportTracking } from "./passport-journey";
import type { PassportLinks } from "./passport-ui";
import s from "./passport.module.css";

/**
 * /services/passport
 *
 * One story, told in order: why you are here, what it costs, the journey,
 * then each stop on it — documents, photo, application, appointment — the
 * reassurance (your data, your family, your status), the reason it matters,
 * and the questions people actually ask.
 *
 * The page renders nothing it has to make up. The price is the services row's;
 * the buttons go to the existing apply flow, WhatsApp and the customer's own
 * applications; the status section is labelled as an illustration because no
 * live passport-stage feed exists.
 */
export function PassportPage({ links, faqs }: { links: PassportLinks; faqs: { question: string; answer: string }[] }) {
  /* A view is a fact about the page, not about the visitor: slug only. */
  useEffect(() => {
    fetch("/api/services/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_slug: PASSPORT_SLUG, click_type: "view" }),
    }).catch(() => {
      /* Analytics must never be the reason a page misbehaves. */
    });
  }, []);

  return (
    <MotionRoot>
      <div className={s.page}>
        <PassportHero links={links} />
        <PassportPriceDock links={links} />
        <PassportJourney />
        <PassportDocumentChecklist links={links} />
        <PassportPhotoGuide />
        <PassportApplication links={links} />
        <PassportAppointment links={links} />
        <PassportSecurity />
        <PassportFamily links={links} />
        <PassportTracking links={links} />
        <PassportTravelStory links={links} />
        <PassportFAQ faqs={faqs} />
        <PassportFinalCTA links={links} />
        <PassportStickyCTA links={links} />
      </div>
    </MotionRoot>
  );
}
