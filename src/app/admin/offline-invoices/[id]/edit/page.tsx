import { notFound, redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { OfflineInvoiceForm } from "@/components/admin/offline-invoice-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getOfflineInvoice } from "@/lib/offline-invoices";

export const dynamic = "force-dynamic";

export default async function EditOfflineInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const invoice = await getOfflineInvoice(id);
  if (!invoice) notFound();

  const staffName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Admin Staff");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader eyebrow="Edit Invoice" title={invoice.invoice_number} description="Update walk-in customer invoice details." />
      <OfflineInvoiceForm invoice={invoice} staffName={staffName} />
    </div>
  );
}
