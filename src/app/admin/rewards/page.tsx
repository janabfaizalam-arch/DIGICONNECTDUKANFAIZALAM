import { redirect } from "next/navigation";
import { BadgePercent, Gift, WalletCards } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getRewardDirection, type RewardTransaction } from "@/lib/wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminRewardsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let transactions: RewardTransaction[] = [];

  if (supabase) {
    const { data } = await supabase.from("reward_transactions").select("*").order("created_at", { ascending: false }).limit(300);
    transactions = (data ?? []) as RewardTransaction[];
  }

  const issued = transactions.filter((item) => getRewardDirection(item.type) === "credit").reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const redeemed = transactions.filter((item) => item.type === "redemption").reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const expired = transactions.filter((item) => item.type === "expiry").reduce((total, item) => total + Number(item.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Ledger" title="Reward Transactions" description="Complete reward wallet audit trail across signup bonuses, referrals, cashback, redemption, expiry, and admin adjustments." />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Reward Issued" value={formatCurrency(issued)} icon={Gift} tone="orange" />
        <AdminStatCard title="Total Redeemed" value={formatCurrency(redeemed)} icon={WalletCards} tone="blue" />
        <AdminStatCard title="Expired Rewards" value={formatCurrency(expired)} icon={BadgePercent} tone="slate" />
      </section>

      <Card className="rounded-2xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Date</th>
                <th className="py-3">User</th>
                <th className="py-3">Type</th>
                <th className="py-3">Description</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Expiry</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="py-3 text-slate-700">{formatDate(transaction.created_at)}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{transaction.user_id}</td>
                  <td className="py-3 text-slate-700">{transaction.type.replace(/_/g, " ")}</td>
                  <td className="py-3 text-slate-600">{transaction.description}</td>
                  <td className={`py-3 font-extrabold ${getRewardDirection(transaction.type) === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                    {getRewardDirection(transaction.type) === "credit" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                  </td>
                  <td className="py-3 text-slate-600">{transaction.expires_at ? formatDate(transaction.expires_at) : "-"}</td>
                  <td className="py-3 font-bold text-slate-700">{transaction.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No reward transactions yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
