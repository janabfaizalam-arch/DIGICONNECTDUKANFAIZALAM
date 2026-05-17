import type { Metadata } from "next";
import Link from "next/link";
import { Gift, WalletCards } from "lucide-react";

import { ContactSection } from "@/components/contact-section";
import { CreditCardOffersSection } from "@/components/credit-card-offers-section";
import { HomepageExtendedSections } from "@/components/homepage-extended-sections";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { HomepageDynamicSlider } from "@/components/homepage-dynamic-slider";
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

export default async function Home() {
  return (
    <>
      <main className="bg-white pb-8 md:pb-0">
        <HomepageOfferNoticeBar />
        <HomepageDynamicSlider />
        <HomepageServiceIconRow />
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <div className="glass-panel grid gap-5 rounded-[1.75rem] border border-white/15 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-orange-600">
                <Gift className="h-4 w-4" />
                Refer & Earn Rewards
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-950 md:text-3xl">Refer friends, earn DigiConnect Rewards</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                Invite a friend with your referral code. They get Rs 100 rewards on signup, and you earn Rs 100 after their first completed service. First service cashback and future rewards are credited to your DigiConnect Reward Wallet.
              </p>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                DigiConnect Rewards are promotional credits. They can be used only for eligible services on DigiConnect Dukan and cannot be withdrawn, transferred, or converted to cash.
              </p>
            </div>
            <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-md shadow-blue-600/15">
              <WalletCards className="h-4 w-4" />
              Open Reward Wallet
            </Link>
          </div>
        </section>
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
