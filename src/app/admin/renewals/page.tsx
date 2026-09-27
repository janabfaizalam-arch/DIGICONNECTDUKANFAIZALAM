"use client";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { RenewalsManager } from "@/components/admin/renewal-reminder-card";

export default function AdminRenewalsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        eyebrow="Messages"
        title="Renewal reminders"
        description="Insurance policies, licences and other services that expire. Customers get a WhatsApp reminder at each chosen day before the renewal date — sent every morning automatically. Add one from the application's page."
      />
      <RenewalsManager />
    </div>
  );
}
