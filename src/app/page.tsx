import type { Metadata } from "next";

import { HeroSearchSection } from "@/components/homepage/hero-search-section";
import { AiServiceFinder } from "@/components/homepage/ai-service-finder";
import { QuickServiceGrid } from "@/components/homepage/quick-service-grid";
import { TrustStrip } from "@/components/homepage/trust-strip";
import { FeaturedServices } from "@/components/homepage/featured-services";
import { CreditCardOffers } from "@/components/homepage/credit-card-offers";
import { CibilFinanceCenter } from "@/components/homepage/cibil-finance-center";
import { WalletCashback } from "@/components/homepage/wallet-cashback";
import { ReferEarn } from "@/components/homepage/refer-earn";
import { WhyChooseUs } from "@/components/homepage/why-choose-us";
import { ServiceCategories } from "@/components/homepage/service-categories";
import { Testimonials } from "@/components/homepage/testimonials";
import { FaqAccordion } from "@/components/homepage/faq-accordion";
import { SupportCenter } from "@/components/homepage/support-center";

import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { HomepagePvcWidget } from "@/components/homepage-pvc-widget";
import { HomepageOfferNoticeBar } from "@/components/homepage-offer-notice-bar";
import { HomepageYuvaPill } from "@/components/homepage-yuva-pill";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | Tax, Insurance, Finance & Gov ID Services",
  description:
    "DigiConnect Dukan by RNOS India Pvt Ltd provides Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission services across India.",
  keywords: [
    "Digital Services in India",
    "Government Services Online",
    "GST Registration",
    "20% DigiWallet Cashback",
    "ITR Filing",
    "MSME Registration",
    "Best Online Digital Services",
    "Digital Wallet Rewards India",
    "Vehicle Insurance",
    "Government Subsidy Loans",
    "Gov ID Form Submission",
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
        {/* Auto-scrolling offer strip — directly below header */}
        <HomepageOfferNoticeBar />

        {/* CM YUVA Highlight Announcement */}
        <HomepageYuvaPill />

        {/* 1. Hero Section (Dynamic Admin Slider) */}
        <HeroSearchSection />

        {/* 2. Quick Service Grid (Premium 3D Glass Icons) */}
        <QuickServiceGrid />

        {/* 3. AI Service Finder (Fuzzy Search & Suggestions) */}
        <AiServiceFinder />

        {/* 4. Trust Strip (Animated Stats counters) */}
        <TrustStrip />

        {/* 5. Featured Services (Apple Card Horizontal Scroll) */}
        <FeaturedServices />

        {/* 6. Credit Card Offers (Glass bank cards & eligibility) */}
        <CreditCardOffers />

        {/* 7. CIBIL & Finance Center (Dedicated Expert desk) */}
        <CibilFinanceCenter />

        {/* 8. Wallet & Cashback (Cashback benefits) */}
        <WalletCashback />

        {/* 9. Refer & Earn (Interactive referral widget) */}
        <ReferEarn />

        {/* 10. Why DigiConnect (Trust details) */}
        <WhyChooseUs />

        {/* 11. Service Categories (Bento Grid layout) */}
        <ServiceCategories />

        {/* 12. Testimonials (Rotating glass reviews) */}
        <Testimonials />

        {/* 13. FAQ Accordion (Collapsible Q&As with schema markup) */}
        <FaqAccordion />

        {/* 14. Contact/Support Center Section */}
        <SupportCenter />
      </main>

      <MarketingFooter />
      <HomepageContactActions />
      <HomepagePvcWidget />
    </>
  );
}
