import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, Inbox, IndianRupee, ShieldCheck } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AgentPasswordResetForm } from "@/components/portal/agent-password-reset-form";
import { AgentStatusButton } from "@/components/portal/agent-status-button";
import { Card } from "@/components/ui/card";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAgentActive(agent: PortalUser) {
  return agent.is_active ?? agent.active ?? true;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default async function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) notFound();

  let agent: PortalUser | null = null;
  let applications: { id: string; service_name: string; status: string; created_at: string }[] = [];
  let leads: { id: string; name: string; mobile: string; service: string; status: string; created_at: string }[] = [];
  let commissions: { amount: number | null; status: string }[] = [];
  let loginStatus = "Auth user unavailable";
  let lastSignIn = "-";

  try {
    const [agentResult, applicationResult, leadResult, commissionResult, authResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, mobile, agent_code, address, area, commission_type, commission_value, commission_rate, active, is_active, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id, created_at, updated_at")
        .eq("id", id)
        .eq("role", "agent")
        .maybeSingle(),
      supabase
        .from("applications")
        .select("id, service_name, status, created_at")
        .or(`agent_id.eq.${id},created_by.eq.${id},assigned_agent_id.eq.${id}`)
        .order("created_at", { ascending: false }),
      supabase.from("leads").select("id, name, mobile, service, status, created_at").eq("agent_id", id).order("created_at", { ascending: false }),
      supabase.from("commissions").select("amount, status").eq("agent_id", id),
      supabase.auth.admin.getUserById(id),
    ]);

    agent = agentResult.error ? null : (agentResult.data as PortalUser | null);
    applications = applicationResult.error ? [] : ((applicationResult.data ?? []) as typeof applications);
    leads = leadResult.error ? [] : ((leadResult.data ?? []) as typeof leads);
    commissions = commissionResult.error ? [] : ((commissionResult.data ?? []) as typeof commissions);

    if (authResult.data.user) {
      loginStatus = authResult.data.user.email_confirmed_at ? "Email confirmed" : "Email pending";
      lastSignIn = formatDate(authResult.data.user.last_sign_in_at);
    }
  } catch (error) {
    console.error("[admin-agent-detail] Failed to load agent", error);
  }

  if (!agent) notFound();

  const active = isAgentActive(agent);
  const pendingCommission = commissions
    .filter((commission) => commission.status === "pending" || commission.status === "approved")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
  const paidCommission = commissions
    .filter((commission) => commission.status === "paid")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <AdminPageHeader
        eyebrow="Agent Profile"
        title={agent.full_name || "Agent"}
        description="Profile, login access, commissions, leads, and applications for this agent."
        action={<AgentStatusButton agentId={agent.id} isActive={active} />}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard title="Leads" value={leads.length} icon="inbox" tone="blue" />
        <AdminStatCard title="Applications" value={applications.length} icon="clipboardList" tone="orange" />
        <AdminStatCard title="Pending Commission" value={safeCurrency(pendingCommission)} icon="indianRupee" tone="slate" />
        <AdminStatCard title="Paid Commission" value={safeCurrency(paidCommission)} icon="wallet" tone="green" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-600">Basic Profile</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{agent.full_name || "Agent"}</h2>
            </div>
            <StatusBadge active={active} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Agent ID / Code" value={agent.agent_code || "-"} mono />
            <InfoTile label="Mobile" value={agent.mobile || "-"} mono />
            <InfoTile label="Email" value={agent.email || "-"} />
            <InfoTile label="Address / Area" value={agent.area || agent.address || "-"} />
            <InfoTile label="Bank Name" value={agent.bank_name || "-"} />
            <InfoTile label="Account Holder" value={agent.bank_account_name || "-"} />
            <InfoTile label="Account Number" value={agent.bank_account_number || "-"} mono />
            <InfoTile label="IFSC / UPI" value={[agent.bank_ifsc, agent.upi_id].filter(Boolean).join(" / ") || "-"} mono />
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-600">Login & Commission</p>
          <div className="mt-5 grid gap-3">
            <InfoTile label="Login URL" value="/login/agent" mono />
            <InfoTile label="Login Status" value={loginStatus} />
            <InfoTile label="Last Login" value={lastSignIn} />
            <InfoTile
              label="Commission"
              value={`${agent.commission_type ?? "fixed"} - ${agent.commission_value ?? agent.commission_rate ?? 0}`}
            />
          </div>
        </Card>
      </div>

      <Card className="p-5 md:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-600">Reset / Change Password</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Update agent login password</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Password changes use Supabase Admin Auth and are never stored in the profile table.
        </p>
        <div className="max-w-xl">
          <AgentPasswordResetForm agentId={agent.id} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-blue-700" />
            <h2 className="font-bold text-slate-950">Recent Leads</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {leads.slice(0, 8).map((lead) => (
              <div key={lead.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{lead.name}</p>
                <p className="mt-1 text-sm text-slate-600">{lead.service} | {lead.mobile}</p>
                <p className="mt-1 text-xs font-bold capitalize text-[var(--primary)]">{lead.status.replace(/_/g, " ")}</p>
              </div>
            ))}
            {!leads.length ? <AdminEmptyState title="No leads" description="Assigned agent leads will appear here." /> : null}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            <h2 className="font-bold text-slate-950">Recent Applications</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {applications.slice(0, 8).map((application) => (
              <div key={application.id} className="grid gap-1 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_140px]">
                <p className="font-medium text-slate-900">{application.service_name}</p>
                <p className="text-sm font-bold capitalize text-[var(--primary)]">{application.status.replace(/_/g, " ")}</p>
              </div>
            ))}
            {!applications.length ? <AdminEmptyState title="No applications" description="Agent applications will appear here." /> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex items-center gap-3 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold text-slate-700">Access is enforced by server-side admin checks and agent role checks.</p>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <IndianRupee className="h-5 w-5 text-orange-600" />
          <p className="text-sm font-semibold text-slate-700">Commission value is stored on the agent profile for application payout rules.</p>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-words font-bold text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
