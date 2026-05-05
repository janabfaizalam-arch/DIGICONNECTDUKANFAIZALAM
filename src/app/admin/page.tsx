import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, FileClock, GalleryHorizontalEnd, Inbox, ListChecks, UsersRound } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminQuickActionCard, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Application, Lead } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function customerFromForm(formData: Record<string, unknown> | null) {
  return String(formData?.name ?? formData?.fullName ?? "Customer");
}

function mobileFromForm(formData: Record<string, unknown> | null) {
  return String(formData?.mobile ?? formData?.phone ?? "");
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let leads: Lead[] = [];
  let applications: Application[] = [];
  let customerCount = 0;
  let leadCount = 0;
  let newLeadCount = 0;
  let applicationCount = 0;
  let pendingApplicationCount = 0;
  let completedApplicationCount = 0;

  if (supabase) {
    const [
      { data: leadData },
      { data: applicationData },
      { count },
      { count: totalLeads },
      { count: totalNewLeads },
      { count: totalApplications },
      { count: totalCompletedApplications },
    ] = await Promise.all([
      supabase.from("leads").select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("applications").select("id, service_name, status, payment_status, created_at, form_data").order("created_at", { ascending: false }).limit(8),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);

    leads = (leadData ?? []) as Lead[];
    applications = (applicationData ?? []) as Application[];
    customerCount = count ?? 0;
    leadCount = totalLeads ?? 0;
    newLeadCount = totalNewLeads ?? 0;
    applicationCount = totalApplications ?? 0;
    completedApplicationCount = totalCompletedApplications ?? 0;
    pendingApplicationCount = Math.max(applicationCount - completedApplicationCount, 0);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Office Dashboard"
        description="A simple workspace for leads, applications, customers, and gallery management."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard title="Total Leads" value={leadCount} icon={Inbox} tone="blue" />
        <AdminStatCard title="New Leads" value={newLeadCount} icon={FileClock} tone="orange" />
        <AdminStatCard title="Total Applications" value={applicationCount} icon={ClipboardList} tone="blue" />
        <AdminStatCard title="Pending Applications" value={pendingApplicationCount} icon={FileClock} tone="orange" />
        <AdminStatCard title="Completed Applications" value={completedApplicationCount} icon={ListChecks} tone="green" />
        <AdminStatCard title="Total Customers" value={customerCount} icon={UsersRound} tone="slate" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AdminQuickActionCard href="/admin/leads" title="View Leads" description="Search calls, enquiries, and uploaded lead files." icon={Inbox} />
        <AdminQuickActionCard href="/admin/applications" title="View Applications" description="Track documents, payment proof, status, and final files." icon={ClipboardList} />
        <AdminQuickActionCard href="/admin/gallery" title="Open Gallery" description="Upload and manage homepage gallery images." icon={GalleryHorizontalEnd} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Recent Leads</h2>
            <Link href="/admin/leads" className="text-sm font-bold text-blue-700">View all</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {leads.length ? (
              leads.slice(0, 5).map((lead) => (
                <Link key={lead.id} href="/admin/leads" className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{lead.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{lead.service}</p>
                    </div>
                    <AdminStatusBadge status={lead.status} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-500">{lead.mobile} | {formatDate(lead.created_at)}</p>
                </Link>
              ))
            ) : (
              <AdminEmptyState title="No leads yet" description="New website enquiries will appear here." />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Recent Applications</h2>
            <Link href="/admin/applications" className="text-sm font-bold text-blue-700">View all</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {applications.length ? (
              applications.slice(0, 5).map((application) => (
                <Link key={application.id} href={`/admin/applications/${application.id}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">{customerFromForm(application.form_data)}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{application.service_name}</p>
                    </div>
                    <AdminStatusBadge status={application.status} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-500">{mobileFromForm(application.form_data) || "No mobile"} | {formatDate(application.created_at)}</p>
                </Link>
              ))
            ) : (
              <AdminEmptyState title="No applications yet" description="Customer applications will appear here after submission." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
