import type { Metadata } from "next";
import { getPublicServiceBySlug } from "@/lib/services";
import { getServiceBySlug } from "@/lib/services-data";
import { FeaturedServicesClient } from "@/components/featured-services-client";

export const metadata: Metadata = {
  title: "Featured Digital Services | DigiConnect Dukan",
  description:
    "Apply online for India's top-rated digital services: GST Registration, ITR Filing, Driving Licence, Passport, CIBIL Analysis, PVC Card, e-Shram registration & Insurance renewals.",
  keywords: [
    "Featured services online",
    "GST registration online apply",
    "ITR tax returns filing",
    "Learning driving license permit",
    "Passport application online",
    "CIBIL analysis score fix",
    "PM Vishwakarma yojna application",
    "PVC card print deliver",
    "e-Shram card registration",
    "Credit card compare",
    "Vehicle insurance quotes"
  ],
  alternates: {
    canonical: "/featured-services",
  },
};

export const dynamic = "force-dynamic";

interface SimpleService {
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  shortDescription: string;
  amount: number;
  badge: string;
}

export default async function FeaturedServicesPage() {
  const slugs = [
    "gst-registration",
    "itr-filing",
    "driving-licence",
    "passport",
    "pm-vishwakarma-yojana",
    "cibil-report-analysis-and-credit-health-consultation",
    "pvc-card",
    "eshram-card-registration",
    "credit-cards",
    "insurance"
  ];

  const servicesDataResolved = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const dbService = await getPublicServiceBySlug(slug);
        if (dbService) return dbService;
      } catch (err) {
        console.warn(`Failed to fetch db service ${slug}:`, err);
      }
      return getServiceBySlug(slug) || null;
    })
  );

  const services: SimpleService[] = servicesDataResolved
    .filter(Boolean)
    .map((s) => {
      if (!s) return null;
      return {
        title: s.title,
        slug: s.slug,
        category: s.category,
        categorySlug: s.categorySlug,
        shortDescription: s.shortDescription,
        amount: s.amount,
        badge: s.badge || ""
      };
    })
    .filter((s): s is SimpleService => s !== null);

  return (
    <main className="min-h-screen pt-20 pb-12 bg-[#fafbfc]">
      <FeaturedServicesClient initialServices={services} />
    </main>
  );
}
