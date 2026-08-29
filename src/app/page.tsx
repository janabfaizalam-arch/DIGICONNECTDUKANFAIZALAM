import type { Metadata } from "next";

import { HomepageHero, HomepageTrustChips } from "@/components/homepage/homepage-hero";
import { QuickActions } from "@/components/homepage/quick-actions";
import { TrendingNow } from "@/components/homepage/trending-now";
import { QuickServiceGrid } from "@/components/homepage/quick-service-grid";
import { FeaturedServices } from "@/components/homepage/featured-services";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { ApplicationTrackingCta } from "@/components/homepage/application-tracking-cta";
import { RecentSuccessStories } from "@/components/homepage/recent-success-stories";
import { RewardCenter } from "@/components/homepage/reward-center";
import { TrustStrip } from "@/components/homepage/trust-strip";
import { GoogleReviews } from "@/components/homepage/google-reviews";
import { VideoTestimonials } from "@/components/homepage/video-testimonials";
import { ReelsRail } from "@/components/homepage/reels-rail";
import { GovernmentSchemesHub } from "@/components/homepage/government-schemes-hub";
import { KnowledgeCenter } from "@/components/homepage/knowledge-center";
import { FaqAccordion } from "@/components/homepage/faq-accordion";
import { BecomeDigiPartner } from "@/components/homepage/become-digi-partner";
import { SupportCenter } from "@/components/homepage/support-center";
import { AboutRnos } from "@/components/homepage/about-rnos";

import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { buildFaqJsonLd, getHomepageFaqs } from "@/lib/homepage/faqs";
import { buildAggregateRatingJsonLd, getHomepageTestimonials } from "@/lib/homepage/testimonials";
import { buildReelsJsonLd, getHomepageReels } from "@/lib/homepage/reels";
import { contactDetails } from "@/lib/constants";
import { getCachedFooterSocialLinks, getCachedHomepageFaqs, getCachedHomepageReels, getCachedHomepageSlides, getCachedHomepageTestimonials, getCachedPublicServices } from "@/lib/homepage/cached";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | Digital Assistance by RNOS India Pvt Ltd",
  description:
    "DigiConnect Dukan by RNOS India Private Limited — private digital assistance for GST, ITR, passport, driving licence, vehicle insurance, PVC cards, and selected government scheme filings. Secure payments, wallet rewards, and application tracking.",
  keywords: [
    "DigiConnect Dukan",
    "RNOS India Pvt Ltd",
    "GST registration assistance",
    "ITR filing support",
    "Passport application help",
    "Driving licence online support",
    "PVC smart card printing",
    "Vehicle insurance assistance",
    "Government scheme documentation support",
    "Digital wallet rewards India",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DigiConnect Dukan | Digital Assistance by RNOS India Pvt Ltd",
    description:
      "Private digital assistance for tax, business, identity, insurance, and selected government scheme filings across India.",
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiConnect Dukan | RNOS India Pvt Ltd",
    description:
      "Private digital assistance for GST, ITR, passport, insurance, PVC cards, and more — with secure payments and tracking.",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const [publicServices, slides, faqs, testimonials, reels, socialLinks] = await Promise.all([
    getCachedPublicServices(),
    getCachedHomepageSlides(),
    getCachedHomepageFaqs(),
    getCachedHomepageTestimonials(),
    getCachedHomepageReels(),
    getCachedFooterSocialLinks(),
  ]);

  // The hero uses the first few; the loader caches the whole short list.
  const heroSlides = slides.slice(0, 5);

  const searchCatalog = publicServices.map((s) => ({
    slug: s.slug,
    title: s.title,
    shortDescription: s.shortDescription,
    priceLabel: s.priceLabel,
    category: s.category,
    amount: s.amount,
  }));

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RNOS India Private Limited",
    alternateName: "DigiConnect Dukan",
    url: siteUrl,
    email: contactDetails.email,
    telephone: `+91${contactDetails.phone}`,
    description:
      "DigiConnect Dukan provides private digital assistance and documentation support services. Not an official government portal.",
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DigiConnect Dukan",
    url: siteUrl,
  };

  // Both are null until real content exists — an empty FAQPage or a rating
  // built from one review is worse than no structured data at all.
  const faqJsonLd = buildFaqJsonLd(faqs);
  const ratingJsonLd = buildAggregateRatingJsonLd(testimonials, "RNOS India Private Limited");
  // Reels have no per-row publish date, so the page render date stands in.
  const reelsJsonLd = buildReelsJsonLd(reels, new Date().toISOString());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      {ratingJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ratingJsonLd) }} />
      ) : null}
      {reelsJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reelsJsonLd) }} />
      ) : null}

      <MotionRoot>
        <main id="main-content" className="homepage-mobile-shell home-option3 bg-[var(--dc-sky-soft)] md:pb-10">
          {/* Above the fold — no scroll reveal here. A section that fades in on
              first paint is a section the user waits for. */}
          <HomepageHero catalog={searchCatalog} slides={heroSlides} />

          <QuickActions />

          <HomepageTrustChips />

          <ReelsRail reels={reels} />

          <TrendingNow />

          <QuickServiceGrid />

          <Reveal>
            <FeaturedServices />
          </Reveal>

          <Reveal>
            <HowItWorks />
          </Reveal>

          <Reveal>
            <TrustStrip />
          </Reveal>

          <Reveal>
            <ApplicationTrackingCta />
          </Reveal>

          <Reveal>
            <RewardCenter />
          </Reveal>

          {/* CMS/API sections render only when real data exists */}
          <Reveal>
            <RecentSuccessStories />
          </Reveal>

          <Reveal>
            <GoogleReviews />
          </Reveal>

          <VideoTestimonials testimonials={testimonials} />

          <Reveal>
            <GovernmentSchemesHub />
          </Reveal>

          <Reveal>
            <KnowledgeCenter />
          </Reveal>

          <Reveal>
            <FaqAccordion items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
          </Reveal>

          <Reveal>
            <BecomeDigiPartner />
          </Reveal>

          <Reveal>
            <SupportCenter />
          </Reveal>

          <Reveal>
            <AboutRnos />
          </Reveal>
        </main>
      </MotionRoot>

      <MarketingFooter variant="homepage" socialLinks={socialLinks} />
      <HomepageContactActions />
    </>
  );
}
