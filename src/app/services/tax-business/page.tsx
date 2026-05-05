import type { Metadata } from "next";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getCategoryBySlug } from "@/lib/services-data";

const category = getCategoryBySlug("tax-business")!;

export const metadata: Metadata = {
  title: "Tax & Business Services | DigiConnect Dukan",
  description: "GST Registration, ITR Filing, MSME Certificate, FSSAI, Trade License, and DPR Project Report services.",
  alternates: { canonical: "/services/tax-business" },
};

export default function TaxBusinessPage() {
  return <CategoryServicesPage category={category} />;
}
