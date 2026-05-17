import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { CreateAgentForm } from "@/components/portal/create-agent-form";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatAgentCode(sequence: number) {
  return `DCD-AGT-${String(sequence).padStart(4, "0")}`;
}

function getNextAgentCode(existingCodes: string[]) {
  const usedNumbers = new Set(
    existingCodes
      .map((code) => Number(String(code).match(/DCD-AGT-(\d+)/i)?.[1] ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  let next = 1;
  while (usedNumbers.has(next)) next += 1;

  return formatAgentCode(next);
}

export default async function NewAgentPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let defaultAgentCode = formatAgentCode(1);

  if (supabase) {
    try {
      const { data, error } = await supabase.from("profiles").select("agent_code").eq("role", "agent");
      defaultAgentCode = error ? defaultAgentCode : getNextAgentCode((data ?? []).map((agent) => String(agent.agent_code ?? "")));
    } catch (error) {
      console.error("[admin-agent-new] Failed to count agents", error);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>
        <AdminPageHeader
          eyebrow="Agent Setup"
          title="Create Agent"
          description="Create a secure Supabase Auth login and profile record for a new active or inactive agent."
        />
        <CreateAgentForm defaultAgentCode={defaultAgentCode} />
      </div>
    </main>
  );
}
