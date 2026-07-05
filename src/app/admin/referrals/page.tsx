import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminReferralManager } from "./referral-manager";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Database connection error.
      </div>
    );
  }

  // Load Referrals
  const { data: referrals } = await supabase
    .from("service_referrals")
    .select("*, agency_partners(id, full_name, business_name)")
    .order("created_at", { ascending: false });

  // Load Payment Links
  const { data: paymentLinks } = await supabase
    .from("payment_links")
    .select("*, applications(service_name, status), profiles(full_name), agency_partners(full_name)")
    .order("created_at", { ascending: false });

  // Load Commissions
  const { data: commissions } = await supabase
    .from("ap_commissions")
    .select("*, agency_partners(full_name), applications(service_name)")
    .order("created_at", { ascending: false });

  // Load Audit Logs
  const { data: auditLogs } = await supabase
    .from("commission_audit_logs")
    .select("*, profiles(full_name)")
    .order("changed_at", { ascending: false });

  // Load active agency partners list (for transfer lookup)
  const { data: partners } = await supabase
    .from("agency_partners")
    .select("id, full_name, business_name")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  // Load customers profiles list (for merge lookup)
  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, email, mobile")
    .eq("role", "customer")
    .order("full_name", { ascending: true });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Referrals & Payments"
        title="Referral & Payment Links Control Center"
        description="Comprehensive admin management of active referrals, client payment links, commissions, and compliance audits."
      />
      
      <AdminReferralManager
        initialReferrals={referrals || []}
        initialPaymentLinks={paymentLinks || []}
        initialCommissions={commissions || []}
        initialAuditLogs={auditLogs || []}
        partners={partners || []}
        customers={customers || []}
      />
    </div>
  );
}
