import { redirect } from "next/navigation";

import { LeadsDashboard, type Lead } from "@/components/dashboard/leads-dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? "User";
  const email = user.email ?? "";
  const supabase = getSupabaseAdmin();

  let leads: Lead[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, mobile, service, message, status, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      leads = data.map((lead) => ({
        ...lead,
        status: (lead.status ?? "new") as Lead["status"],
      }));
    }
  }

  return <LeadsDashboard initialLeads={leads} name={name} email={email} />;
}
