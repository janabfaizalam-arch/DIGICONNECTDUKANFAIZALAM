import { ContactSection } from "@/components/contact-section";
import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { HeroSection } from "@/components/hero-section";
import { ServicesSection } from "@/components/services-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";

export default function Home() {
  return (
    <>
      <main className="pb-8 md:pb-0">
        <HeroSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <PhotoGallerySection />
        <TestimonialsSection />
        <ContactSection />
      </main>
    </>
  );
}
