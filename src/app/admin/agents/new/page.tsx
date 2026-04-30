import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CreateAgentForm } from "@/components/portal/create-agent-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatAgentCode(count: number) {
  return `DCD-AGT-${String(count + 1).padStart(4, "0")}`;
}

export default async function NewAgentPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let agentCount = 0;

  if (supabase) {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent");
    agentCount = count ?? 0;
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Setup</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Create Agent</h1>
        </div>
        <CreateAgentForm defaultAgentCode={formatAgentCode(agentCount)} />
      </div>
    </main>
  );
}
