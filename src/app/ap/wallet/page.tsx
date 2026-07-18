import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ApWalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: partner } = supabase
    ? await supabase.from("agency_partners").select("id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data: payouts } = supabase && partner
    ? await supabase
        .from("ap_payouts")
        .select("id, amount, status, created_at, paid_at")
        .eq("agency_partner_id", partner.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Wallet & payouts</h1>
      <ul className="mt-8 divide-y divide-[var(--border)]">
        {(payouts ?? []).length === 0 ? (
          <li className="py-6 text-[var(--muted)]">No payouts yet.</li>
        ) : (
          (payouts ?? []).map((row) => (
            <li key={row.id as string} className="flex justify-between py-3 text-sm">
              <span>{String(row.status)}</span>
              <span>₹{Number(row.amount ?? 0).toFixed(2)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
