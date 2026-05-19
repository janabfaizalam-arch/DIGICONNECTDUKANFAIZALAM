import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { OfflineInvoiceForm } from "@/components/admin/offline-invoice-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export default async function NewOfflineInvoicePage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const adminName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Admin");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader eyebrow="Create Invoice" title="Walk-In Customer Invoice" description="Generate an office invoice for an offline customer." />
      <OfflineInvoiceForm adminName={adminName} />
    </div>
  );
}
