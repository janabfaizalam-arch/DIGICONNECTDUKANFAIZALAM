import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getPublicCategoryBySlug, getPublicServicesByCategory } from "@/lib/services";

export const metadata: Metadata = {
  title: "Gov ID & Form Submission | DigiConnect Dukan",
  description: "PAN Card, Passport Assistance, Driving Licence, Voter ID, and Labour Card / e-Shram Card support.",
  alternates: { canonical: "/services/gov-id-form-submission" },
};

export const dynamic = "force-dynamic";

export default async function GovIdFormSubmissionPage() {
  const [category, services] = await Promise.all([getPublicCategoryBySlug("gov-id-form-submission"), getPublicServicesByCategory("gov-id-form-submission")]);
  if (!category) notFound();
  return <CategoryServicesPage category={category} services={services} />;
}
