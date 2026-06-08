import type { Metadata } from "next";

import { HeroSearchSection } from "@/components/homepage/hero-search-section";
import { SmartSearchHub } from "@/components/homepage/smart-search-hub";
import { QuickServiceGrid } from "@/components/homepage/quick-service-grid";
import { FeaturedServices } from "@/components/homepage/featured-services";
import { WhyChooseUs } from "@/components/homepage/why-choose-us";
import { RewardCenter } from "@/components/homepage/reward-center";
import { TrustStrip } from "@/components/homepage/trust-strip";
import { ServiceCategories } from "@/components/homepage/service-categories";
import { RecentSuccessStories } from "@/components/homepage/recent-success-stories";
import { Testimonials } from "@/components/homepage/testimonials";
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

        {/* Section 3 — Quick Categories (8 Glass Cards) */}
        <QuickServiceGrid />

        {/* Section 4 — Featured Services (Horizontal Carousel) */}
        <FeaturedServices />

        {/* Section 5 — Compact Reward/Referral Center */}
        <RewardCenter />

        {/* Section 6 — Popular Categories Showcase */}
        <ServiceCategories />

        {/* Section 7 — Why DigiConnect (Premium Visual Trust) */}
        <WhyChooseUs />

        {/* Section 8 — Trust Center (Animated Counters) */}
        <TrustStrip />

        {/* Section 9 — Recent Success Stories */}
        <RecentSuccessStories />

        {/* Section 10 — Testimonials */}
        <Testimonials />

        {/* Section 11 — FAQ Accordion */}
        <FaqAccordion />

        {/* Section 12 — Support Center */}
        <SupportCenter />
      </main>

      {/* Section 13 — Footer */}
      <MarketingFooter />

      {/* Sticky WhatsApp CTA */}
      <HomepageContactActions />
    </>
  );
}
