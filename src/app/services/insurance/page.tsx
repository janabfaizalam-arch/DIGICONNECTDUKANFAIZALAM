import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getPublicCategoryBySlug, getPublicServicesByCategory } from "@/lib/services";

export const metadata: Metadata = {
  title: "All Vehicle Insurance | DigiConnect Dukan",
  description: "Bike, car, commercial vehicle, tractor, truck, third party, comprehensive, renewal, and claim assistance.",
  alternates: { canonical: "/services/insurance" },
};

export const dynamic = "force-dynamic";

export default async function InsurancePage() {
  const [category, services] = await Promise.all([getPublicCategoryBySlug("insurance"), getPublicServicesByCategory("insurance")]);
  if (!category) notFound();
  return <CategoryServicesPage category={category} services={services} />;
}
