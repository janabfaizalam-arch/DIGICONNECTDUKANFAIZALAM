import { ContactSection } from "@/components/contact-section";
import { HeroSection } from "@/components/hero-section";
import { LeadSection } from "@/components/lead-section";
import { ProcessSection } from "@/components/process-section";
import { ServicesSection } from "@/components/services-section";
import { SiteHeader } from "@/components/site-header";
import { StickyMobileCta } from "@/components/sticky-mobile-cta";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="pb-24 md:pb-0">
        <HeroSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <ProcessSection />
        <LeadSection />
        <ContactSection />
      </main>
      <StickyMobileCta />
    </>
  );
}
