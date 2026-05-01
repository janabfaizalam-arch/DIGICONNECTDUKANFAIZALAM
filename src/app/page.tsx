import type { Metadata } from "next";

import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { HeroSection } from "@/components/hero-section";
import { ServicesSection } from "@/components/services-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | PAN India Digital Services by RNoS",
  description:
    "DigiConnect Dukan by RNoS provides PAN India support for PAN Card, Aadhaar update assistance, Voter ID, Passport, Driving Licence, GST, and business registration services.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      <main className="pb-8 md:pb-0">
        <HeroSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <PhotoGallerySection />
        <TestimonialsSection />
      </main>
    </>
  );
}
