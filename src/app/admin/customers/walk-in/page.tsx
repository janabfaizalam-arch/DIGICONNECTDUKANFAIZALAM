import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { WalkInCustomerWizard } from "@/components/admin/walk-in-customer-wizard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WalkInCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; step?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
        <AdminPageHeader
          eyebrow="Walk-in / Counter"
          title="New Customer"
          description="Phone-first lookup → confirm/create → service → application. Existing customers never get a duplicate profile."
        />
        <WalkInCustomerWizard
          initialCustomerId={params.customerId ?? null}
          initialStep={params.step ?? null}
        />
        <p className="text-xs text-slate-500">
          Legacy email/password create remains at{" "}
          <Link href="/admin/customers/new" className="font-semibold underline">
            /admin/customers/new
          </Link>{" "}
          until fully retired.
        </p>
      </div>
    </main>
  );
}
