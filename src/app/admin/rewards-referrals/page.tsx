import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard, AdminUnderSetup } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type WalletTransactionRow = {
  id: string;
  user_id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number;
  balance_after: number;
  application_id: string | null;
  payment_id: string | null;
  referred_user_id: string | null;
  referrer_user_id: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

type ReferralEventRow = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  signup_reward_status: string;
  referrer_reward_status: string;
  referred_first_application_id: string | null;
  referred_first_completed_at: string | null;
  risk_score: number;
  risk_flags: string[];
  created_at: string;
};

type WalletRow = {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  suspicious?: boolean;
  frozen?: boolean;
};

export default async function AdminRewardsReferralsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let transactions: WalletTransactionRow[] = [];
  let referrals: ReferralEventRow[] = [];
  let wallets: WalletRow[] = [];
  let dataUnavailable = false;

  if (supabase) {
    try {
      const [walletResult, transactionResult, referralResult] = await Promise.all([
        supabase.from("reward_wallets").select("user_id, balance, lifetime_earned, lifetime_redeemed, suspicious, frozen").limit(1000),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("referral_events").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

      if (walletResult.error || transactionResult.error || referralResult.error) {
        dataUnavailable = true;
      }

      wallets = (walletResult.data ?? []) as WalletRow[];
      transactions = (transactionResult.data ?? []) as WalletTransactionRow[];
      referrals = (referralResult.data ?? []) as ReferralEventRow[];
    } catch (error) {
      console.error("[admin-rewards-referrals] Failed to load rewards data", error);
      dataUnavailable = true;
    }
  } else {
    dataUnavailable = true;
  }

  const totalLiability = wallets.reduce((total, wallet) => total + Number(wallet.balance ?? 0), 0);
  const totalCredited = transactions.filter((row) => row.direction === "credit" && row.status !== "reversed").reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const totalRedeemed = transactions.filter((row) => row.direction === "debit" && row.status !== "reversed").reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const pendingReferralRewards = referrals.filter((row) => row.referrer_reward_status === "pending").length;
  const suspiciousReferrals = referrals.filter((row) => Number(row.risk_score ?? 0) >= 40).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Closed-loop rewards"
        title="Rewards & Referrals"
        description="Track Reward Wallet liability, customer ledger entries, referral status, application-linked cashback, and suspicious referral signals."
      />

      {dataUnavailable ? (
        <AdminUnderSetup title="Rewards & referrals are under setup" description="Apply the latest Supabase migration to enable the secure reward wallet ledger and referral risk dashboard." />
      ) : null}

      {!dataUnavailable ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard title="Wallet Liability" value={safeCurrency(totalLiability)} icon="wallet" tone="blue" />
            <AdminStatCard title="Rewards Credited" value={safeCurrency(totalCredited)} icon="gift" tone="orange" />
            <AdminStatCard title="Total Redeemed" value={safeCurrency(totalRedeemed)} icon="badgePercent" tone="green" />
            <AdminStatCard title="Pending Referral Rewards" value={pendingReferralRewards} icon="users" tone="slate" />
            <AdminStatCard title="Suspicious Referrals" value={suspiciousReferrals} icon="userCheck" tone="orange" />
          </section>

          <Card className="rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Wallet Ledger</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-3">Date</th>
                    <th className="py-3">User</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Balance After</th>
                    <th className="py-3">Application</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-3 text-slate-700">{safeDate(transaction.created_at)}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{transaction.user_id}</td>
                      <td className="py-3 text-slate-700">{transaction.type.replace(/_/g, " ")}</td>
                      <td className={`py-3 font-extrabold ${transaction.direction === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                        {transaction.direction === "credit" ? "+" : "-"}{safeCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 font-bold text-slate-700">{safeCurrency(transaction.balance_after)}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{transaction.application_id ?? "-"}</td>
                      <td className="py-3 font-bold text-slate-700">{transaction.status}</td>
                      <td className="py-3 text-slate-600">{transaction.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No wallet transactions yet.</p> : null}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Referral Tree</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-3">Joined</th>
                    <th className="py-3">Code</th>
                    <th className="py-3">Referrer</th>
                    <th className="py-3">Referred User</th>
                    <th className="py-3">Signup Reward</th>
                    <th className="py-3">First Service</th>
                    <th className="py-3">Referrer Reward</th>
                    <th className="py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td className="py-3 text-slate-700">{safeDate(referral.created_at)}</td>
                      <td className="py-3 font-mono text-xs font-bold text-slate-700">{referral.referral_code}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{referral.referrer_user_id}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{referral.referred_user_id}</td>
                      <td className="py-3 font-bold text-slate-700">{referral.signup_reward_status}</td>
                      <td className="py-3 text-slate-700">{referral.referred_first_completed_at ? safeDate(referral.referred_first_completed_at) : "pending"}</td>
                      <td className="py-3 font-bold text-slate-700">{referral.referrer_reward_status}</td>
                      <td className={`py-3 font-extrabold ${referral.risk_score >= 40 ? "text-orange-700" : "text-emerald-700"}`}>
                        {referral.risk_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {referrals.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No referral events yet.</p> : null}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
