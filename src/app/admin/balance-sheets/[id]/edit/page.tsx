import { notFound, redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { BalanceSheetForm } from "@/components/admin/balance-sheet-form";
import { PageContainer } from "@/components/admin/primitives/layout";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getBalanceSheet } from "@/lib/balance-sheets/store";

export const dynamic = "force-dynamic";

export default async function EditBalanceSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const sheet = await getBalanceSheet((await params).id);
  if (!sheet) notFound();

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader eyebrow={sheet.reference} title={`Edit — ${sheet.businessName}`} backHref={`/admin/balance-sheets/${sheet.id}`} backLabel="Back to statements" />
      <BalanceSheetForm id={sheet.id} initial={sheet} />
    </PageContainer>
  );
}
