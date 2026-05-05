import type { Metadata } from "next";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getCategoryBySlug } from "@/lib/services-data";

const category = getCategoryBySlug("insurance")!;

export const metadata: Metadata = {
  title: "All Vehicle Insurance | DigiConnect Dukan",
  description: "Bike, car, commercial vehicle, tractor, truck, third party, comprehensive, renewal, and claim assistance.",
  alternates: { canonical: "/services/insurance" },
};

export default function InsurancePage() {
  return <CategoryServicesPage category={category} />;
}
