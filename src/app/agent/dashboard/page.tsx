import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { AgentAddCustomerForm } from "@/components/agent/agent-add-customer-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AgentProfile = {
  full_name: string | null;
  email: string | null;
  agent_code: string | null;
};

async function getAgentProfile(userId: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, agent_code")
    .eq("id", userId)
    .eq("role", "agent")
    .maybeSingle();

  if (error) {
    console.error("[agent-dashboard] Failed to load profile.", error.message);
    return null;
  }

  return data as AgentProfile | null;
}

export default async function AgentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const profile = await getAgentProfile(user.id);
  const agentName = profile?.full_name || user.user_metadata.full_name || user.email || "Agent";
  const agentCode = profile?.agent_code || "Agent";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Agent Dashboard</p>
              <h1 className="mt-2 truncate text-2xl font-bold text-slate-950 md:text-3xl">{agentName}</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-500">{agentCode}</p>
            </div>
            <LogoutButton className="hidden h-11 justify-center sm:inline-flex sm:w-auto" />
          </div>
        </header>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Add Customer</h2>
              <p className="mt-1 text-sm text-slate-500">Create a customer lead linked to your agent account.</p>
            </div>
          </div>
          <AgentAddCustomerForm />
        </Card>
      </div>
    </main>
  );
}
