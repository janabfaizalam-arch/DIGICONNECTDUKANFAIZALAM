import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
        <AdminPageHeader
          eyebrow="Customer Signup"
          title="Create Customer"
          description="Create a Supabase Auth login and synced customer records without duplicating email or mobile identity."
        />
        <CreateCustomerForm />
      </div>
    </main>
  );
}
