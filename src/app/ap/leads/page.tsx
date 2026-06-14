import { redirect } from "next/navigation";
import { getVisibleAgentServices } from "@/lib/agent-services";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/portal-types";
import { PartnerLeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function PartnerLeadsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const supabase = getSupabaseAdmin();
  const services = await getVisibleAgentServices(user.id);
  let leads = [] as Lead[];

  if (supabase) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });
    leads = (data ?? []) as Lead[];
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PartnerLeadsClient initialLeads={leads} services={services} />
      </div>
    </main>
  );
}
