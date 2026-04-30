import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) notFound();

  const [{ data: agent }, { data: applications }, { data: commissions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, mobile, agent_code, commission_type, commission_value, commission_rate, active, is_active")
      .eq("id", id)
      .single(),
    supabase.from("applications").select("id, service_name, status, created_at").or(`created_by.eq.${id},assigned_agent_id.eq.${id}`).order("created_at", { ascending: false }),
    supabase.from("commissions").select("amount, status").eq("agent_id", id),
  ]);

  if (!agent) notFound();

  const profile = agent as PortalUser;
  const pendingCommission = (commissions ?? [])
    .filter((commission) => commission.status === "pending")
    .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <Card className="p-5 md:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{profile.full_name || "Agent"}</h1>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Mobile</p>
              <p className="mt-1 font-mono font-bold">{profile.mobile || "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Agent Code</p>
              <p className="mt-1 font-mono font-bold">{profile.agent_code || "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Pending Commission</p>
              <p className="mt-1 font-bold">{formatCurrency(pendingCommission)}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border p-4">
            <p className="font-bold text-slate-950">Recent Leads</p>
            <div className="mt-3 grid gap-2">
              {(applications ?? []).slice(0, 10).map((application) => (
                <div key={application.id} className="grid gap-1 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_140px]">
                  <p className="font-medium text-slate-900">{application.service_name}</p>
                  <p className="text-sm font-bold capitalize text-[var(--primary)]">{application.status.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
