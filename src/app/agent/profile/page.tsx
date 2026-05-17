import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: profile } = supabase
    ? await supabase
        .from("profiles")
        .select("full_name, mobile, email, agent_code, address, area, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const fields = [
    ["Name", profile?.full_name],
    ["Mobile", profile?.mobile],
    ["Email", profile?.email],
    ["Agent Code", profile?.agent_code],
    ["Area", profile?.area || profile?.address],
    ["Bank Account Name", profile?.bank_account_name],
    ["Bank Account Number", profile?.bank_account_number],
    ["IFSC", profile?.bank_ifsc],
    ["Bank Name", profile?.bank_name],
    ["UPI ID", profile?.upi_id],
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Profile</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Profile / Bank Details</h1>
        </div>
        <Card className="rounded-2xl p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 break-words font-semibold text-slate-950">{value || "-"}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
