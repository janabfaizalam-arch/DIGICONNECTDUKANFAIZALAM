import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminInsuranceQuotationsManager } from "@/components/admin/admin-insurance-quotations-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminInsuranceQuotations } from "@/lib/insurance-quotations";

export const dynamic = "force-dynamic";

export default async function AdminInsuranceQuotationsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const quotations = await getAdminInsuranceQuotations();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Insurance Desk"
        title="Insurance Quotations"
        description="Create, manage, and share official vehicle insurance quotation links with customers."
        action={
          <div className="inline-flex h-11 items-center gap-2 rounded-full bg-orange-50 px-4 text-sm font-bold text-orange-700 ring-1 ring-orange-100">
            <ShieldCheck className="h-4 w-4" />
            DigiConnect Dukan
          </div>
        }
      />
      <AdminInsuranceQuotationsManager initialQuotations={quotations} />
    </div>
  );
}
