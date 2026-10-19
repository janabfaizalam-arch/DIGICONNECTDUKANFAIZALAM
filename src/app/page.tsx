import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { HomepagePreviewBridge } from "@/components/homepage/preview-bridge";
import { HomeFooter } from "@/components/home-launch/home-footer";
import { HomeNav } from "@/components/home-launch/home-nav";
import { RevealController } from "@/components/home-launch/interactive";
import { LaunchBuilder } from "@/components/home-launch/launch-builder";
import { StructureExplorer } from "@/components/home-launch/structure-explorer";
import {
  AddonsCatalog,
  DocumentCenter,
  JourneyStory,
  LaunchFaq,
  MobileDock,
  PackageComparison,
  StructureComparison,
  UseCases,
} from "@/components/home-launch/sections-client";
import { CostTransparency, Finale, Guides, Hero, SectionHead, ServiceDirectory, TrustSection } from "@/components/home-launch/sections";
import { getCachedFooterSocialLinks } from "@/lib/homepage/cached";
import { getEnabledSocialLinks } from "@/lib/social-links";
import { LAUNCH_FAQS } from "@/lib/homepage/launch-catalog";
import { getLaunchHomepageData } from "@/lib/homepage/launch-data";
import "@/components/home-launch/home-launch.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

/** Technical labels on the blueprint and the data. Loaded by this page only. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-rl-mono",
});

const description =
  "Start your company in India with RNOS. Compare Private Limited, LLP, OPC, partnership and proprietorship, build your setup with GST, Udyam, trademark and more, and see itemised service fees before you apply.";

export const metadata: Metadata = {
  title: "Company Registration & Business Launch in India | RNOS – DigiConnect Dukan",
  description,
  keywords: [
    "company registration India",
    "private limited company registration",
    "LLP registration",
    "OPC registration",
    "business structure comparison",
    "GST registration",
    "Udyam MSME registration",
    "RNOS India Pvt Ltd",
    "DigiConnect Dukan",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Your Business Begins Here | RNOS company registration",
    description,
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Business Begins Here | RNOS",
    description: "Compare business structures, build your company setup and see itemised costs before you apply.",
  },
};

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const isPreview = Boolean((await searchParams)?.preview);
  const [{ catalogue, resolved, guides }, socialLinks] = await Promise.all([getLaunchHomepageData(), getCachedFooterSocialLinks()]);

  /*
    The Organization entity is published once, site-wide, from the root
    layout. Only what this page visibly shows is described here: the site and
    the questions answered on it. No ratings and no offers — none exist that
    could honestly be marked up.
  */
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DigiConnect Dukan by RNOS India",
    url: siteUrl,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LAUNCH_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const searchCatalog = catalogue.map(({ title, slug, priceLabel }) => ({ title, slug, priceLabel }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className={`rl ${plexMono.variable}`}>
        <HomeNav resolved={resolved} catalogue={searchCatalog} />

        <main id="main-content" className="rl-main">
          <div data-band="hero">
            <Hero />
          </div>

          <section id="structures" data-band="structures" className="rl-section" aria-labelledby="structures-title">
            <div className="rl-wrap">
              <SectionHead
                id="structures-title"
                index="03"
                eyebrow="Business structures"
                title={
                  <>
                    Five ways to <em>own</em> a business.
                  </>
                }
                lede="Each structure answers three questions differently: who owns it, who is liable for its debts, and how much paperwork it takes to keep. Pick one to see how it works."
              />
              <StructureExplorer resolved={resolved} />
            </div>
          </section>

          <section id="builder" data-band="builder" className="rl-section rl-section--night" aria-labelledby="builder-title">
            <div className="rl-grid-bg" aria-hidden="true" style={{ opacity: 0.6 }} />
            <div className="rl-wrap" style={{ position: "relative" }}>
              <SectionHead
                id="builder-title"
                index="04"
                eyebrow="Business launch builder"
                title={
                  <>
                    Build <em>your</em> company, service by service.
                  </>
                }
                lede="Tell us what you're starting, choose a structure and add only what you need. Every price comes from our live catalogue, and anything we can't sell online yet is marked as quoted on request."
              />
              <LaunchBuilder resolved={resolved} />
            </div>
          </section>

          <section id="services" data-band="services" className="rl-section rl-section--paper" aria-labelledby="services-title">
            <div className="rl-wrap">
              <SectionHead
                id="services-title"
                index="05"
                eyebrow="What we do for you"
                title={
                  <>
                    Everything we can <em>register</em> for you.
                  </>
                }
                lede="First the company itself, then the registrations most new businesses add. Each one shows today's status: buy online and pay at checkout, or ask and we quote before any work starts."
              />
              <ServiceDirectory resolved={resolved} />
            </div>
          </section>

          <section id="packages" data-band="packages" className="rl-section" aria-labelledby="packages-title">
            <div className="rl-wrap">
              <SectionHead
                id="packages-title"
                index="06"
                eyebrow="Registration packages"
                title={
                  <>
                    Start from a package. <em>Change anything.</em>
                  </>
                }
                lede="Four starting points for the builder. Each is priced item by item from the catalogue, so you can see exactly what is in it and remove what you don't need."
              />
              <PackageComparison resolved={resolved} />
            </div>
          </section>

          <section id="journey" data-band="journey" className="rl-section rl-section--night" aria-labelledby="journey-title">
            <div className="rl-wrap">
              <SectionHead
                id="journey-title"
                index="07"
                eyebrow="The complete journey"
                title={
                  <>
                    From idea to <em>incorporated</em> — and beyond.
                  </>
                }
                lede="Ten stages, labelled honestly: what happens before you file, what incorporation itself covers, what follows it, what is optional and what recurs every year."
              />
              <JourneyStory />
            </div>
          </section>

          <section id="addons" data-band="addons" className="rl-section rl-section--ivory2" aria-labelledby="addons-title">
            <div className="rl-wrap">
              <SectionHead
                id="addons-title"
                index="08"
                eyebrow="Registrations, licences & add-ons"
                title={
                  <>
                    Add one service. <em>Or several.</em>
                  </>
                }
                lede="You don't need a package to buy a single registration. Each service says when the law requires it — not every business needs every licence."
              />
              <AddonsCatalog resolved={resolved} />
            </div>
          </section>

          <section id="documents" data-band="documents" className="rl-section" aria-labelledby="documents-title">
            <div className="rl-wrap">
              <SectionHead
                id="documents-title"
                index="09"
                eyebrow="Document readiness"
                title={
                  <>
                    Know what to <em>keep ready.</em>
                  </>
                }
                lede="Tick off what you already have. Required, conditional and prepared-for-you documents are listed separately, so you can see what is actually missing."
              />
              <DocumentCenter />
            </div>
          </section>

          <section id="costs" data-band="costs" className="rl-section rl-section--paper" aria-labelledby="costs-title">
            <div className="rl-wrap">
              <SectionHead
                id="costs-title"
                index="10"
                eyebrow="Cost transparency"
                title={
                  <>
                    Every rupee, <em>by who it goes to.</em>
                  </>
                }
                lede="Company registration costs are made of different charges paid to different people. Here is what each one is, so a quote never surprises you."
              />
              <CostTransparency resolved={resolved} />
            </div>
          </section>

          <section id="compare" data-band="compare" className="rl-section" aria-labelledby="compare-title">
            <div className="rl-wrap">
              <SectionHead
                id="compare-title"
                index="11"
                eyebrow="Structure comparison"
                title={
                  <>
                    Side by side, <em>in full.</em>
                  </>
                }
                lede="Ownership, liability, governance, fundraising, compliance, tax and continuity for all five structures. Filter to the questions you care about."
              />
              <StructureComparison />
            </div>
          </section>

          <section id="trust" data-band="trust" className="rl-section rl-section--ivory2" aria-labelledby="trust-title">
            <div className="rl-wrap">
              <SectionHead
                id="trust-title"
                index="12"
                eyebrow="Trust & transparency"
                title={
                  <>
                    Clear about who we are — <em>and who we aren&apos;t.</em>
                  </>
                }
                lede="No invented numbers, no borrowed badges. Just the company behind the service, how your money and documents are handled, and where to reach us."
              />
              <TrustSection />
            </div>
          </section>

          <section id="scenarios" data-band="scenarios" className="rl-section" aria-labelledby="scenarios-title">
            <div className="rl-wrap">
              <SectionHead
                id="scenarios-title"
                index="13"
                eyebrow="Business use cases"
                title={
                  <>
                    Founders like <em>you</em> might start here.
                  </>
                }
                lede="Illustrative situations, not customer stories — each shows a structure worth considering and the services that are often relevant. Open any of them in the builder and adjust."
              />
              <UseCases resolved={resolved} />
            </div>
          </section>

          <section id="guides" data-band="guides" className="rl-section rl-section--paper" aria-labelledby="guides-title">
            <div className="rl-wrap">
              <SectionHead
                id="guides-title"
                index="14"
                eyebrow="Knowledge center"
                title={
                  <>
                    Read before you <em>register.</em>
                  </>
                }
                lede="Published guides from our blog, and the explainers built into this page."
              />
              <Guides guides={guides} />
            </div>
          </section>

          <section id="faq" data-band="faq" className="rl-section" aria-labelledby="faq-title">
            <div className="rl-wrap">
              <SectionHead
                id="faq-title"
                index="15"
                eyebrow="Questions"
                title={
                  <>
                    Asked <em>before</em> almost every registration.
                  </>
                }
              />
              <LaunchFaq />
            </div>
          </section>

          <div data-band="start">
            <Finale catalogue={catalogue} />
          </div>
        </main>

        <MobileDock resolved={resolved} />
        <RevealController />
      </div>

      {isPreview ? <HomepagePreviewBridge /> : null}

      <HomeFooter resolved={resolved} socialLinks={socialLinks.length ? socialLinks : getEnabledSocialLinks()} />
      <HomepageContactActions />
    </>
  );
}
