import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getPublicCategoryBySlug, getPublicServicesByCategory } from "@/lib/services";

export const metadata: Metadata = {
  title: "Finance, Banking & Government Subsidy Loans | DigiConnect Dukan",
  description: "PMEGP, Mudra, Vishwakarma, SVANidhi, MSME loan, credit cards, accounts, CIBIL, and loan file preparation.",
  alternates: { canonical: "/services/finance-banking" },
};

export const dynamic = "force-dynamic";

export default async function FinanceBankingPage() {
  const [category, services] = await Promise.all([getPublicCategoryBySlug("finance-banking"), getPublicServicesByCategory("finance-banking")]);
  if (!category) notFound();
  return <CategoryServicesPage category={category} services={services} />;
}
