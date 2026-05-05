import { redirect } from "next/navigation";
import { CalendarDays, Phone, UserRound } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminCustomersPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let customers: Customer[] = [];
  const applicationCounts = new Map<string, number>();

  if (supabase) {
    const [{ data: customerData }, { data: applicationData }] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("customer_id"),
    ]);

    customers = (customerData ?? []) as Customer[];
    (applicationData ?? []).forEach((application) => {
      const customerId = String(application.customer_id ?? "");
      if (customerId) {
        applicationCounts.set(customerId, (applicationCounts.get(customerId) ?? 0) + 1);
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Customers" title="Customers" description="Simple customer records for office staff." />
      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Customers" value={customers.length} icon={UserRound} tone="blue" />
        <AdminStatCard title="With Applications" value={customers.filter((customer) => (applicationCounts.get(customer.id) ?? 0) > 0).length} icon={CalendarDays} tone="green" />
        <AdminStatCard title="Online Customers" value={customers.filter((customer) => customer.source === "online").length} icon={Phone} tone="orange" />
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        {!customers.length ? <AdminEmptyState title="No customers yet" description="Customer records will appear after applications or office entry." /> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <article key={customer.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{customer.full_name}</p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{customer.mobile || "-"}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                  {customer.source.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>Email: <span className="font-semibold text-slate-800">{customer.email || "-"}</span></p>
                <p>City: <span className="font-semibold text-slate-800">{customer.city || "-"}</span></p>
                <p>Applications: <span className="font-semibold text-slate-800">{applicationCounts.get(customer.id) ?? 0}</span></p>
                <p>Created: <span className="font-semibold text-slate-800">{formatDate(customer.created_at)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
