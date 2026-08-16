import type { Metadata } from "next";

import { ServicesDirectoryClient } from "@/components/services-directory-client";
import { getPublicServices } from "@/lib/services";

export const metadata: Metadata = {
  title: "All Digital Services | DigiConnect Dukan",
  description:
    "Apply online with guided support and verified assistance. Explore Cards & PVC Printing, Loans & Government Schemes, Banking, Passport, Licences, Tax, GST, and corporate registrations.",
  keywords: [
    "DigiConnect Dukan services",
    "Tax and Business services",
    "All Vehicle Insurance",
    "Government subsidy loans",
    "Gov ID form submission",
    "PVC card printing",
    "CIBIL analysis",
    "passport assistance",
    "business registration"
  ],
  alternates: {
    canonical: "/services",
  },
};

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [rawServices, { q }] = await Promise.all([getPublicServices(), searchParams]);
  const services = rawServices.map((s) => {
    const clean = { ...s };
    delete (clean as { icon?: unknown }).icon;
    return clean;
  });

  // The homepage hero sends an unmatched query here rather than dropping it,
  // so the directory has to open with that query already applied.
  const initialQuery = (q ?? "").trim().slice(0, 80);

  return (
    <main className="min-h-screen px-2 py-4 md:px-6 md:py-8 bg-[#fcfcfd]">
      <ServicesDirectoryClient initialServices={services} initialQuery={initialQuery} />
    </main>
  );
}
