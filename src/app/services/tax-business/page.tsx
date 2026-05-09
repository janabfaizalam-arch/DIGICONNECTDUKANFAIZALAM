import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getPublicCategoryBySlug, getPublicServicesByCategory } from "@/lib/services";

export const metadata: Metadata = {
  title: "Tax & Business Services | DigiConnect Dukan",
  description: "GST Registration, ITR Filing, MSME Certificate, FSSAI, Trade License, and DPR Project Report services.",
  alternates: { canonical: "/services/tax-business" },
};

export const dynamic = "force-dynamic";

export default async function TaxBusinessPage() {
  const [category, services] = await Promise.all([getPublicCategoryBySlug("tax-business"), getPublicServicesByCategory("tax-business")]);
  if (!category) notFound();
  return <CategoryServicesPage category={category} services={services} />;
}
