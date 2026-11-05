import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { BalanceSheetForm } from "@/components/admin/balance-sheet-form";
import { PageContainer } from "@/components/admin/primitives/layout";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export default async function NewBalanceSheetPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Balance Sheets"
        title="New Balance Sheet"
        description="Enter the customer's basic figures. The statements are worked out as you type."
        backHref="/admin/balance-sheets"
        backLabel="Balance Sheets"
      />
      <BalanceSheetForm />
    </PageContainer>
  );
}
