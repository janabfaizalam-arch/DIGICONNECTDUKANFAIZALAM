import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HeroSection } from "@/components/hero-section";
import { ContactSection } from "@/components/contact-section";
import { MarketingFooter } from "@/components/marketing-footer";
import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { ProcessSection } from "@/components/process-section";
import { ServicesSection } from "@/components/services-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";
import { getCurrentUser, getCurrentUserRole, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | Digital & Government Services Online",
  description:
    "DigiConnect Dukan by RNoS India Pvt Ltd provides Digital Services in India and Government Services Online for PAN Card, Aadhaar, GST, certificates, licences, Orai, Jalaun, and nearby areas.",
  keywords: [
    "Digital Services in India",
    "Government Services Online",
    "PAN Card",
    "Aadhaar",
    "GST Registration",
    "Certificates online",
    "Orai",
    "Jalaun",
  ],
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);

    if (isCustomerRole(role)) {
      redirect("/customer/dashboard");
    }
  }

  return (
    <>
      <main className="pb-8 md:pb-0">
        <HeroSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <ProcessSection />
        <PhotoGallerySection />
        <ContactSection />
      </main>
      <MarketingFooter />
    </>
  );
}
