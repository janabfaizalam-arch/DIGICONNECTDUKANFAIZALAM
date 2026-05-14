import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminLeadsList } from "@/components/admin/admin-leads-list";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Lead } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let leads: Lead[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, mobile, service, message, status, source, converted_application_id, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false });
      leads = error ? [] : (data ?? []) as Lead[];
    } catch (error) {
      console.error("[admin-leads] Failed to load leads", error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Leads" title="Customer Enquiries" description="Search and follow up website leads from one simple office screen." />
      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Leads" value={leads.length} icon="inbox" tone="blue" />
        <AdminStatCard title="New Leads" value={leads.filter((lead) => lead.status === "new").length} icon="fileClock" tone="orange" />
        <AdminStatCard title="Converted Leads" value={leads.filter((lead) => lead.status === "converted").length} icon="listChecks" tone="green" />
      </section>
      <AdminLeadsList leads={leads} />
    </div>
  );
}
