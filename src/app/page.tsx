import type { Metadata } from "next";

import { HeroSection } from "@/components/hero-section";
import { ContactSection } from "@/components/contact-section";
import { HomepageExtendedSections } from "@/components/homepage-extended-sections";
import { HomepageContactActions } from "@/components/homepage-contact-actions";
import { MarketingFooter } from "@/components/marketing-footer";
import { PhotoGallerySection } from "@/components/photo-gallery-section";
import { ProcessSection } from "@/components/process-section";
import { ServicesSection } from "@/components/services-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";
import { getCurrentUser, getCurrentUserRole, isAdminRole, isCustomerRole } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/customer-profile";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | Tax, Insurance, Finance & Gov ID Services",
  description:
    "DigiConnect Dukan by RNOS India Pvt Ltd provides Tax & Business, All Vehicle Insurance, Finance & Banking, and Gov ID form submission services across India.",
  keywords: [
    "Digital Services in India",
    "Government Services Online",
    "GST Registration",
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
  const user = await getCurrentUser();
  const role = user ? await getCurrentUserRole(user) : null;
  const customerProfile = user && isCustomerRole(role) ? await getCustomerProfile(user.id) : null;
  const customerName =
    customerProfile?.full_name?.trim() ||
    String(user?.user_metadata.full_name ?? user?.user_metadata.name ?? "").trim() ||
    "Customer";
  const heroViewer = user
    ? isCustomerRole(role)
      ? { role: "customer" as const, name: customerName }
      : role === "agent" || role === "staff" || isAdminRole(role)
        ? { role }
        : null
    : null;

  return (
    <>
      <main className="pb-8 md:pb-0">
        <HeroSection viewer={heroViewer} />
        <ServicesSection />
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
