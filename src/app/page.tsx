import type { Metadata } from "next";

import { HeroSearchSection } from "@/components/homepage/hero-search-section";
import { SmartSearchHub } from "@/components/homepage/smart-search-hub";
import { TrendingNow } from "@/components/homepage/trending-now";
import { QuickServiceGrid } from "@/components/homepage/quick-service-grid";
import { FeaturedServices } from "@/components/homepage/featured-services";
import { RecentSuccessStories } from "@/components/homepage/recent-success-stories";
import { RewardCenter } from "@/components/homepage/reward-center";
import { TrustStrip } from "@/components/homepage/trust-strip";
import { WhyChooseUs } from "@/components/homepage/why-choose-us";
import { GoogleReviews } from "@/components/homepage/google-reviews";
import { VideoTestimonials } from "@/components/homepage/video-testimonials";
import { GovernmentSchemesHub } from "@/components/homepage/government-schemes-hub";
import { KnowledgeCenter } from "@/components/homepage/knowledge-center";
import { FaqAccordion } from "@/components/homepage/faq-accordion";
import { SupportCenter } from "@/components/homepage/support-center";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | India's Premium Digital Services Marketplace",
  description:
    "DigiConnect Dukan by RNOS India Pvt Ltd — GST Registration, ITR Filing, Passport, Driving Licence, Vehicle Insurance, CIBIL Analysis, PVC Cards & more. 20% Wallet Cashback on every service.",
  keywords: [
    "Digital Services India",
    "GST Registration Online",
    "ITR Filing Service",
    "Passport Application",
    "Driving Licence Online",
    "CIBIL Score Analysis",
    "PVC Smart Card",
    "Vehicle Insurance",
    "20% DigiWallet Cashback",
    "PM Vishwakarma Yojana",
    "Government Services Online",
    "Digital Wallet Rewards India",
  ],
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <>
      <main className="homepage-mobile-shell bg-white pb-8 md:pb-0">
        {/* Section 1 — Hero Slides */}
        <HeroSearchSection />

        {/* Section 2 — Smart Search Hub */}
        <SmartSearchHub />

        {/* Section 3 — Trending Now */}
        <TrendingNow />

        {/* Section 4 — Quick Categories (8 Glass Cards) */}
        <QuickServiceGrid />

        {/* Section 5 — Featured Services */}
        <FeaturedServices />

        {/* Section 6 — Recent Success Stories */}
        <RecentSuccessStories />

        {/* Section 7 — Reward Center */}
        <RewardCenter />

        {/* Section 8 — Trust Center (Animated Counters) */}
        <TrustStrip />

        {/* Section 9 — Why DigiConnect (Premium Visual Trust) */}
        <WhyChooseUs />

        {/* Section 10 — Google Reviews */}
        <GoogleReviews />

        {/* Section 11 — Video Testimonials */}
        <VideoTestimonials />

        {/* Section 12 — Government Schemes Hub */}
        <GovernmentSchemesHub />

        {/* Section 13 — Knowledge Center */}
        <KnowledgeCenter />

        {/* Section 14 — FAQ Accordion */}
        <FaqAccordion />

        {/* Section 15 — Support Center */}
        <SupportCenter />
      </main>

      {/* Section 16 — Footer */}
      <MarketingFooter />

      {/* Sticky WhatsApp CTA */}
      <HomepageContactActions />
    </>
  );
}
