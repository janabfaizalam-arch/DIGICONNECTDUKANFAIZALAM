import type { Metadata } from "next";

import { ServicesDirectoryClient } from "@/components/services/services-directory-client";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { TrustStrip } from "@/components/homepage/trust-strip";
import { RewardCenter } from "@/components/homepage/reward-center";
import { FaqAccordion } from "@/components/homepage/faq-accordion";
import { SupportCenter } from "@/components/homepage/support-center";
import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { getPublicServices } from "@/lib/services";
import { buildFaqJsonLd, getHomepageFaqs } from "@/lib/homepage/faqs";
import { getFooterSocialLinks } from "@/lib/homepage/social";

export const metadata: Metadata = {
  title: "All Digital Services | DigiConnect Dukan",
  description:
    "Apply online with guided support and verified assistance. Explore Cards & PVC Printing, Loans & Government Schemes, Banking, Passport, Licences, Tax, GST, and corporate registrations.",
  keywords: [
    "DigiConnect Dukan services",
    "Tax and Business services",
    "All Vehicle Insurance",
    "Government subsidy loans",
    "Gov ID form submission",
    "PVC card printing",
    "CIBIL analysis",
    "passport assistance",
    "business registration"
  ],
  alternates: {
    canonical: "/services",
  },
};

export const dynamic = "force-dynamic";

/**
 * The services directory.
 *
 * The page used to be one 1,143-line client component that carried its own
 * copy of almost everything: a service card, a search matcher, a synonym
 * table, a rewards band, a "why choose us" grid, an FAQ accordion and a
 * support desk with three phone numbers typed into the JSX. Five of those
 * already existed as shared components, maintained, and better — so the
 * duplicates are gone and the real ones render here instead. That is why this
 * file grew imports while the bundle shrank.
 *
 * What is left in the directory component is what only this page has: the
 * hero, the category browser, the result grid and the quick-view drawer.
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [rawServices, faqs, socialLinks, { q }] = await Promise.all([
    getPublicServices(),
    getHomepageFaqs(),
    getFooterSocialLinks(),
    searchParams,
  ]);

  const services = rawServices.map((s) => {
    const clean = { ...s };
    delete (clean as { icon?: unknown }).icon;
    return clean;
  });

  // The homepage hero sends an unmatched query here rather than dropping it,
  // so the directory has to open with that query already applied.
  const initialQuery = (q ?? "").trim().slice(0, 80);

  // Null until real questions exist — an empty FAQPage is worse than none.
  const faqJsonLd = buildFaqJsonLd(faqs);

  return (
    <>
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}

      <MotionRoot>
        <main id="main-content" className="homepage-mobile-shell home-option3 bg-[var(--dc-sky-soft)] md:pb-10">
          {/* No Reveal above the fold: a hero that fades in on first paint is
              a hero the customer waits for. */}
          <ServicesDirectoryClient initialServices={services} initialQuery={initialQuery} />

          <Reveal>
            <HowItWorks />
          </Reveal>

          <Reveal>
            <TrustStrip />
          </Reveal>

          <Reveal>
            <RewardCenter />
          </Reveal>

          <Reveal>
            <FaqAccordion items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
          </Reveal>

          <Reveal>
            <SupportCenter />
          </Reveal>
        </main>
      </MotionRoot>

      <MarketingFooter variant="homepage" socialLinks={socialLinks} />
      <HomepageContactActions />
    </>
  );
}
