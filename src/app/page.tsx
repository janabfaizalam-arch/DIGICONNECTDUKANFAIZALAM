import { ContactSection } from "@/components/contact-section";
import { HeroSection } from "@/components/hero-section";
import { LeadSection } from "@/components/lead-section";
import { ProcessSection } from "@/components/process-section";
import { ServicesSection } from "@/components/services-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";

export default function Home() {
  return (
    <>
      <main className="pb-24 md:pb-0">
        <HeroSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <ProcessSection />
        <TestimonialsSection />
        <LeadSection />
        <ContactSection />
      </main>
    </>
  );
}
