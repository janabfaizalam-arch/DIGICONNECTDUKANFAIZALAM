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
        {/* Section 2 — Smart Search Hub */}
        <SmartSearchHub />

        {/* Section 1 — Hero Slides */}
        <HeroSearchSection />

        {/* Prominent Smart Print QR Service Button */}
        <ScrollReveal>
          <div className="px-4 py-2.5 max-w-2xl mx-auto relative z-20">
            <Link
              href="/print"
              className="group relative block overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-[1.2px] shadow-sm hover:shadow-md transition-all duration-300 select-none cursor-pointer"
            >
              {/* Outer border glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 to-amber-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Inner card container */}
              <div className="relative flex items-center justify-between bg-white/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-[15px] border border-white/40">
                <div className="flex items-center gap-3.5 text-left">
                  {/* Icon with double gradient ring */}
                  <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-[1.5px] shadow-sm shrink-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center">
                      <Printer className="h-5 w-5 text-orange-600 stroke-[2] group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                      Smart Print
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal font-semibold">
                      Scan QR & print instantly. Upload PDFs or photos securely.
                    </p>
                  </div>
                </div>
                {/* Micro-animated CTA button */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 text-orange-600 group-hover:text-white shadow-xs group-hover:translate-x-0.5 transition-all duration-300">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
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
