import { redirect } from "next/navigation";
import { CalendarDays, Phone, UserRound } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminCustomerManager } from "@/components/admin/admin-customer-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Application, Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let customers: Customer[] = [];
  let applications: Pick<Application, "customer_id" | "status" | "created_at">[] = [];

  if (supabase) {
    const [{ data: customerData }, { data: applicationData }] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("customer_id, status, created_at").order("created_at", { ascending: false }),
    ]);

    customers = (customerData ?? []) as Customer[];
    applications = (applicationData ?? []) as Pick<Application, "customer_id" | "status" | "created_at">[];
  }

  const rows = customers.map((customer) => {
    const customerApplications = applications.filter((application) => application.customer_id === customer.id);
    return {
      ...customer,
      applicationsCount: customerApplications.length,
      lastStatus: customerApplications[0]?.status ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Customers" title="Customers" description="Registered users and manually added customers in one CRM list." />
      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Customers" value={customers.length} icon={UserRound} tone="blue" />
        <AdminStatCard title="With Applications" value={rows.filter((customer) => customer.applicationsCount > 0).length} icon={CalendarDays} tone="green" />
        <AdminStatCard title="Online Customers" value={customers.filter((customer) => customer.source === "online").length} icon={Phone} tone="orange" />
      </section>
      <AdminCustomerManager customers={rows} />
    </div>
  );
}
