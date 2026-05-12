import type { Metadata } from "next";

import { ContactSection } from "@/components/contact-section";
import { CreditCardOffersSection } from "@/components/credit-card-offers-section";
import { HomepageDynamicSlider } from "@/components/homepage-dynamic-slider";
import { HomepageExtendedSections } from "@/components/homepage-extended-sections";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { HomepageOfferNoticeBar } from "@/components/homepage-offer-notice-bar";
import { HomepageServiceIconRow } from "@/components/homepage-service-icon-row";
import { MarketingFooter } from "@/components/marketing-footer";
import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { ProcessSection } from "@/components/process-section";
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

export default function Home() {
  return (
    <>
      <main className="bg-white pb-8 md:pb-0">
        <HomepageOfferNoticeBar />
        <HomepageDynamicSlider />
        <HomepageServiceIconRow />
        <CreditCardOffersSection />
        <WhyChooseUsSection />
        <ProcessSection />
        <HomepageExtendedSections />
        <PhotoGallerySection />
        <ContactSection />
      </main>
      <MarketingFooter />
      <HomepageContactActions />
    </>
  );
}
