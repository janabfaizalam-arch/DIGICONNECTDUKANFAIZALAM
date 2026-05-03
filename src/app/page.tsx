import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HeroSection } from "@/components/hero-section";
import { MarketingFooter } from "@/components/marketing-footer";
import { ProcessSection } from "@/components/process-section";
import { ServicesSection } from "@/components/services-section";
import { WhyChooseUsSection } from "@/components/why-choose-us-section";
import { getCurrentUser, getCurrentUserRole, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DigiConnect Dukan | PAN India Digital Services by RNoS",
  description:
    "DigiConnect Dukan by RNoS provides PAN India support for PAN Card, Aadhaar update assistance, Voter ID, Passport, Driving Licence, GST, and business registration services.",
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
      </main>
      <MarketingFooter />
    </>
  );
}
