import type { Metadata } from "next";

import { ContactSection } from "@/components/contact-section";
import { CreditCardOffersSection } from "@/components/credit-card-offers-section";
import { HomepageExtendedSections } from "@/components/homepage-extended-sections";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { HomepagePvcWidget } from "@/components/homepage-pvc-widget";
import { HomepageDynamicSlider } from "@/components/homepage-dynamic-slider";
import { HomepageOfferNoticeBar } from "@/components/homepage-offer-notice-bar";
import { HomepageYuvaPill } from "@/components/homepage-yuva-pill";
import { HomepageServiceIconRow } from "@/components/homepage-service-icon-row";
import { HomepageOfferStrip } from "@/components/homepage-offer-strip";
import { MarketingFooter } from "@/components/marketing-footer";
import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";

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
        {/* 1. Auto-scrolling offer strip — directly below header */}
        <HomepageOfferNoticeBar />

        {/* CM YUVA Highlight Pill Announcement */}
        <HomepageYuvaPill />

        {/* 2. Hero Slider — full-width, swipeable, compact */}
        <HomepageDynamicSlider />

        {/* 3. Service Icons Grid — 4×2, 8 icons */}
        <HomepageServiceIconRow />

        {/* 4. Featured Offers Slider — horizontal swipeable cards */}
        <HomepageOfferStrip />

        {/* 5. Credit Cards Section — carousel */}
        <CreditCardOffersSection />

        {/* 6–10. Lower sections */}
        <TestimonialsSection />
        <WhyChooseUsSection />
        <HomepageExtendedSections />
        <PhotoGallerySection />
        <ContactSection />
      </main>
      <MarketingFooter />
      <HomepageContactActions />
      <HomepagePvcWidget />
    </>
  );
}
