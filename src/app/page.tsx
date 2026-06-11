import type { Metadata } from "next";
import Link from "next/link";
import { Printer, ArrowRight } from "lucide-react";

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
import { TrustStripMarquee } from "@/components/homepage/trust-strip-marquee";
import { ScrollReveal } from "@/components/scroll-reveal";

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

        {/* Prominent Smart Print QR Service Button */}
        <ScrollReveal>
          <div className="px-4 py-3 max-w-2xl mx-auto text-center relative z-20">
            <Link
              href="/print"
              className="group flex items-center justify-between glass-liquid-premium p-4 md:p-5 rounded-2xl border border-white/50 text-slate-800 hover:text-blue-600 transition-all shadow-md select-none cursor-pointer"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Printer className="h-6 w-6 stroke-[2] animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-black text-slate-800 leading-tight">
                    Smart Print
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold leading-normal">
                    Scan QR, upload PDFs/images, pay securely and print instantly at the shop.
                  </p>
                </div>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition-all">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </ScrollReveal>

        {/* Section 3 — Trending Now */}
        <ScrollReveal>
          <TrendingNow />
        </ScrollReveal>

        {/* Section 4 — Quick Categories (8 Glass Cards) */}
        <ScrollReveal>
          <QuickServiceGrid />
        </ScrollReveal>

        {/* Section 5 — Featured Services */}
        <ScrollReveal>
          <FeaturedServices />
        </ScrollReveal>

        {/* Section 6 — Recent Success Stories */}
        <ScrollReveal>
          <RecentSuccessStories />
        </ScrollReveal>

        {/* Section 7 — Reward Center */}
        <ScrollReveal>
          <RewardCenter />
        </ScrollReveal>

        {/* Trust Strip Marquee under Refer & Earn */}
        <ScrollReveal>
          <TrustStripMarquee />
        </ScrollReveal>

        {/* Section 8 — Trust Center (Animated Counters) */}
        <ScrollReveal>
          <TrustStrip />
        </ScrollReveal>

        {/* Section 9 — Why DigiConnect (Premium Visual Trust) */}
        <ScrollReveal>
          <WhyChooseUs />
        </ScrollReveal>

        {/* Section 10 — Google Reviews */}
        <ScrollReveal>
          <GoogleReviews />
        </ScrollReveal>

        {/* Section 11 — Video Testimonials */}
        <ScrollReveal>
          <VideoTestimonials />
        </ScrollReveal>

        {/* Section 12 — Government Schemes Hub */}
        <ScrollReveal>
          <GovernmentSchemesHub />
        </ScrollReveal>

        {/* Section 13 — Knowledge Center */}
        <ScrollReveal>
          <KnowledgeCenter />
        </ScrollReveal>

        {/* Section 14 — FAQ Accordion */}
        <ScrollReveal>
          <FaqAccordion />
        </ScrollReveal>

        {/* Section 15 — Support Center */}
        <ScrollReveal>
          <SupportCenter />
        </ScrollReveal>
      </main>

      {/* Section 16 — Footer */}
      <MarketingFooter />

      {/* Sticky WhatsApp CTA */}
      <HomepageContactActions />
    </>
  );
}
