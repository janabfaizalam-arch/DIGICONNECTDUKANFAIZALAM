import type { Metadata } from "next";

import { CategoryServicesPage } from "@/components/category-services-page";
import { getCategoryBySlug } from "@/lib/services-data";

const category = getCategoryBySlug("finance-banking")!;

export const metadata: Metadata = {
  title: "Finance, Banking & Government Subsidy Loans | DigiConnect Dukan",
  description: "PMEGP, Mudra, Vishwakarma, SVANidhi, MSME loan, credit cards, accounts, CIBIL, and loan file preparation.",
  alternates: { canonical: "/services/finance-banking" },
};

export default function FinanceBankingPage() {
  return <CategoryServicesPage category={category} />;
}
