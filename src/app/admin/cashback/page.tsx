import { redirect } from "next/navigation";
import { BadgePercent, IndianRupee, WalletCards } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { RewardTransaction, ServiceRewardRule } from "@/lib/wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminCashbackPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let cashback: RewardTransaction[] = [];
  let rules: ServiceRewardRule[] = [];

  if (supabase) {
    const [{ data: cashbackData }, { data: ruleData }] = await Promise.all([
      supabase.from("reward_transactions").select("*").eq("type", "cashback").order("created_at", { ascending: false }).limit(200),
      supabase.from("service_reward_rules").select("*").order("service_slug", { ascending: true }),
    ]);

    cashback = (cashbackData ?? []) as RewardTransaction[];
    rules = (ruleData ?? []) as ServiceRewardRule[];
  }

  const issued = cashback.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const active = cashback.filter((item) => item.status === "active").reduce((total, item) => total + Number(item.remaining_amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Cashback" title="Cashback Reports" description="Monitor cashback-generating services, reward liability, and active cashback rules." />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Cashback Issued" value={formatCurrency(issued)} icon={BadgePercent} tone="orange" />
        <AdminStatCard title="Active Liability" value={formatCurrency(active)} icon={WalletCards} tone="blue" />
        <AdminStatCard title="Active Rules" value={rules.filter((rule) => rule.active).length} icon={IndianRupee} tone="green" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Rules</p>
          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{rule.service_slug}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {rule.cashback_type} {rule.cashback_value} | max redemption {rule.max_redemption_percent}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-3">Date</th>
                  <th className="py-3">User</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Cashback</th>
                  <th className="py-3">Remaining</th>
                  <th className="py-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashback.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="py-3 text-slate-700">{formatDate(transaction.created_at)}</td>
                    <td className="py-3 font-mono text-xs text-slate-500">{transaction.user_id}</td>
                    <td className="py-3 text-slate-600">{transaction.description}</td>
                    <td className="py-3 font-extrabold text-emerald-700">{formatCurrency(Number(transaction.amount))}</td>
                    <td className="py-3 text-slate-700">{formatCurrency(Number(transaction.remaining_amount))}</td>
                    <td className="py-3 text-slate-600">{transaction.expires_at ? formatDate(transaction.expires_at) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cashback.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No cashback issued yet.</p> : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
