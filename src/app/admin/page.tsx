import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgePercent, ClipboardList, FileClock, GalleryHorizontalEnd, Gift, Inbox, IndianRupee, ListChecks, ReceiptText, UsersRound, WalletCards } from "lucide-react";

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
  let todayLeadCount = 0;
  let todayApplicationCount = 0;
  let paymentPendingCount = 0;
  let revenueEstimate = 0;
  let totalReferrals = 0;
  let pendingReferrals = 0;
  let completedReferrals = 0;
  let rewardIssued = 0;
  let cashbackIssued = 0;
  let expiredRewards = 0;
  let walletLiability = 0;
  let fraudFlags = 0;
  let staffWorkload: { name: string; count: number }[] = [];
  let topServices: { service: string; count: number }[] = [];

  if (supabase) {
    const [
      { data: leadData },
      { data: applicationData },
      { count },
      { count: totalLeads },
      { count: totalNewLeads },
      { count: totalApplications },
      { count: totalCompletedApplications },
      { data: analyticsApplications },
      { data: staffData },
      { data: rewardData },
      { data: walletData },
      { count: referralCount },
      { count: pendingReferralCount },
      { count: completedReferralCount },
    ] = await Promise.all([
      supabase.from("leads").select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("applications").select("id, service_name, status, payment_status, created_at, form_data").order("created_at", { ascending: false }).limit(8),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("applications").select("service_name, status, payment_status, amount, assigned_staff_id, created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("id, full_name, email").eq("role", "staff"),
      supabase.from("reward_transactions").select("type, amount, remaining_amount, status").limit(5000),
      supabase.from("wallets").select("balance_points, suspicious").limit(5000),
      supabase.from("referrals").select("id", { count: "exact", head: true }),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);

    leads = (leadData ?? []) as Lead[];
    applications = (applicationData ?? []) as Application[];
    customerCount = count ?? 0;
    leadCount = totalLeads ?? 0;
    newLeadCount = totalNewLeads ?? 0;
    applicationCount = totalApplications ?? 0;
    completedApplicationCount = totalCompletedApplications ?? 0;
    pendingApplicationCount = Math.max(applicationCount - completedApplicationCount, 0);
    const today = new Date().toISOString().slice(0, 10);
    todayLeadCount = leads.filter((lead) => lead.created_at.slice(0, 10) === today).length;
    todayApplicationCount = (analyticsApplications ?? []).filter((application) => String(application.created_at).slice(0, 10) === today).length;
    paymentPendingCount = (analyticsApplications ?? []).filter((application) => application.payment_status === "pending").length;
    revenueEstimate = (analyticsApplications ?? [])
      .filter((application) => application.status === "completed" || application.payment_status === "verified")
      .reduce((total, application) => total + Number(application.amount ?? 0), 0);
    totalReferrals = referralCount ?? 0;
    pendingReferrals = pendingReferralCount ?? 0;
    completedReferrals = completedReferralCount ?? 0;
    rewardIssued = (rewardData ?? [])
      .filter((transaction) => ["signup_bonus", "referral_bonus", "cashback", "admin_adjustment"].includes(String(transaction.type)))
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    cashbackIssued = (rewardData ?? [])
      .filter((transaction) => transaction.type === "cashback")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    expiredRewards = (rewardData ?? [])
      .filter((transaction) => transaction.type === "expiry")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    walletLiability = (walletData ?? []).reduce((total, wallet) => total + Number(wallet.balance_points ?? 0), 0);
    fraudFlags = (walletData ?? []).filter((wallet) => wallet.suspicious).length;
    const staffNames = new Map((staffData ?? []).map((staff) => [staff.id, staff.full_name || staff.email]));
    staffWorkload = Array.from(
      (analyticsApplications ?? []).reduce((grouped, application) => {
        const staffId = String(application.assigned_staff_id ?? "");
        if (!staffId) return grouped;
        grouped.set(staffId, (grouped.get(staffId) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()),
    )
      .map(([staffId, count]) => ({ name: staffNames.get(staffId) ?? "Staff", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    topServices = Array.from(
      (analyticsApplications ?? []).reduce((grouped, application) => {
        const service = String(application.service_name ?? "Service");
        grouped.set(service, (grouped.get(service) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()),
    )
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Today Leads" value={todayLeadCount} icon={Inbox} tone="orange" />
        <AdminStatCard title="Today Applications" value={todayApplicationCount} icon={ClipboardList} tone="blue" />
        <AdminStatCard title="Revenue Estimate" value={`₹${revenueEstimate.toLocaleString("en-IN")}`} icon={IndianRupee} tone="green" />
        <AdminStatCard title="Payment Pending" value={paymentPendingCount} icon={ReceiptText} tone="orange" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total Referrals" value={totalReferrals} icon={Gift} tone="blue" />
        <AdminStatCard title="Pending / Completed" value={`${pendingReferrals} / ${completedReferrals}`} icon={UsersRound} tone="orange" />
        <AdminStatCard title="Reward Issued" value={`Rs ${rewardIssued.toLocaleString("en-IN")}`} icon={BadgePercent} tone="green" />
        <AdminStatCard title="Wallet Liability" value={`Rs ${walletLiability.toLocaleString("en-IN")}`} icon={WalletCards} tone="slate" />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Cashback Issued" value={`Rs ${cashbackIssued.toLocaleString("en-IN")}`} icon={BadgePercent} tone="orange" />
        <AdminStatCard title="Expired Rewards" value={`Rs ${expiredRewards.toLocaleString("en-IN")}`} icon={FileClock} tone="slate" />
        <AdminStatCard title="Fraud Flags" value={fraudFlags} icon={UsersRound} tone="orange" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AdminQuickActionCard href="/admin/leads" title="View Leads" description="Search calls, enquiries, and uploaded lead files." icon={Inbox} />
        <AdminQuickActionCard href="/admin/applications" title="View Applications" description="Track documents, Razorpay payment status, and final files." icon={ClipboardList} />
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

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-lg font-bold text-slate-950">Staff Workload</h2>
          <div className="mt-4 grid gap-3">
            {staffWorkload.length ? staffWorkload.map((item) => (
              <div key={item.name} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-950">{item.name}</p>
                  <p className="text-sm font-bold text-blue-700">{item.count}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-blue-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(item.count * 12, 100)}%` }} />
                </div>
              </div>
            )) : <AdminEmptyState title="No assigned workload" description="Assigned staff applications will appear here." />}
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-lg font-bold text-slate-950">Top Services</h2>
          <div className="mt-4 grid gap-3">
            {topServices.length ? topServices.map((item) => (
              <div key={item.service} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-950">{item.service}</p>
                  <p className="text-sm font-bold text-orange-700">{item.count}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-orange-100">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(item.count * 12, 100)}%` }} />
                </div>
              </div>
            )) : <AdminEmptyState title="No service data" description="Applications will build this list automatically." />}
          </div>
        </div>
      </section>
    </div>
  );
}
