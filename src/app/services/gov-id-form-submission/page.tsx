import type { Metadata } from "next";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getCategoryBySlug } from "@/lib/services-data";

const category = getCategoryBySlug("gov-id-form-submission")!;

export const metadata: Metadata = {
  title: "Gov ID & Form Submission | DigiConnect Dukan",
  description: "PAN Card, Passport Assistance, Driving Licence, Voter ID, and Labour Card / e-Shram Card support.",
  alternates: { canonical: "/services/gov-id-form-submission" },
};

export default function GovIdFormSubmissionPage() {
  return <CategoryServicesPage category={category} />;
}
