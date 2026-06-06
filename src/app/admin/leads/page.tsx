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
        .select("id, name, mobile, service, message, status, source, notes, payment_amount, converted_application_id, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false });
      leads = error ? [] : (data ?? []) as Lead[];
    } catch (error) {
      console.error("[admin-leads] Failed to load leads", error);
    }
  }

  // GST CRM Statistics
  const gstLeads = leads.filter(l => l.service && l.service.toLowerCase().includes("gst"));
  const gstTotal = gstLeads.length;
  const gstConverted = gstLeads.filter(l => l.status === "converted").length;
  const gstConversionRate = gstTotal > 0 ? Math.round((gstConverted / gstTotal) * 100) : 0;
  const gstRevenue = gstLeads
    .filter(l => l.status === "converted")
    .reduce((acc, l) => acc + (l.payment_amount || 1999), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Leads" title="Customer Enquiries" description="Search and follow up website leads from one simple office screen." />
      
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Global Enquiries Overview</p>
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminStatCard title="Total Leads" value={leads.length} icon="inbox" tone="blue" />
          <AdminStatCard title="New Leads" value={leads.filter((lead) => lead.status === "new").length} icon="fileClock" tone="orange" />
          <AdminStatCard title="Converted Leads" value={leads.filter((lead) => lead.status === "converted").length} icon="listChecks" tone="green" />
        </section>
      </div>

      <div className="border-t border-slate-200/60 pt-6">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          GST Autopilot Campaign Metrics
        </p>
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminStatCard title="Total GST Leads" value={gstTotal} icon="inbox" tone="blue" />
          <AdminStatCard title="GST Conversion Rate" value={`${gstConversionRate}%`} icon="listChecks" tone="orange" />
          <AdminStatCard title="GST Est. Revenue" value={`₹${gstRevenue.toLocaleString("en-IN")}`} icon="indianRupee" tone="green" />
        </section>
      </div>

      <AdminLeadsList leads={leads} />
    </div>
  );
}
