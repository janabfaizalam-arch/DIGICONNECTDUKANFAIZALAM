import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard, AdminUnderSetup } from "@/components/admin/admin-shell";
import { AdminWalletAdjustmentForm, AdminWalletStatusForm } from "@/components/admin/admin-wallet-adjustment-form";
import { Card } from "@/components/ui/card";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { RewardTransaction } from "@/lib/wallet";
import { getRewardDirection } from "@/lib/wallet";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return safeDate(date);
}

type WalletUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile?: string | null;
};

type WalletBalance = {
  user_id: string;
  balance: number;
};

type ReferralEventRow = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  referrer_reward_status: string;
  referrer_signup_reward_status: string;
  created_at: string;
};

export default async function AdminWalletPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let transactions: RewardTransaction[] = [];
  let customers: WalletUserProfile[] = [];
  let walletBalances: WalletBalance[] = [];
  let referralEvents: ReferralEventRow[] = [];
  let totalIssued = 0;
  let totalRedeemed = 0;
  let repeatCustomerPercent = 0;
  let walletConversionPercent = 0;
  let totalReferrals = 0;
  let totalReferralRewards = 0;
  let dataUnavailable = false;

  if (supabase) {
    try {
      const [transactionResult, customerResult, applicationResult, walletResult, referralResult, referralRewardsResult] = await Promise.all([
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, full_name, email, mobile").eq("role", "customer").order("full_name", { ascending: true }),
        supabase.from("applications").select("user_id, wallet_used_amount, status").not("user_id", "is", null).limit(2000),
        supabase.from("reward_wallets").select("user_id, balance").order("balance", { ascending: false }),
        supabase.from("referral_events").select("id, referrer_user_id, referred_user_id, referral_code, referrer_reward_status, referrer_signup_reward_status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("wallet_transactions").select("amount").in("type", ["referrer_signup_bonus", "referrer_first_service_bonus"]).neq("status", "reversed"),
      ]);

      if (transactionResult.error || customerResult.error || applicationResult.error) {
        dataUnavailable = true;
      }

      transactions = (transactionResult.data ?? []) as RewardTransaction[];
      customers = (customerResult.data ?? []) as WalletUserProfile[];
      walletBalances = (walletResult.data ?? []) as WalletBalance[];
      referralEvents = (referralResult.data ?? []) as ReferralEventRow[];
      const applicationData = applicationResult.data ?? [];

      totalIssued = transactions
        .filter((transaction) => getRewardDirection(transaction.type) === "credit" && transaction.type !== "expiry")
        .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
      totalRedeemed = transactions
        .filter((transaction) => transaction.type === "redeem")
        .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);

      totalReferrals = referralEvents.length;
      totalReferralRewards = ((referralRewardsResult.data ?? []) as Array<{ amount: number | null }>)
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

      const userOrderCounts = new Map<string, number>();
      let walletOrders = 0;
      for (const application of applicationData) {
        const userId = String(application.user_id ?? "");
        if (!userId) continue;
        userOrderCounts.set(userId, (userOrderCounts.get(userId) ?? 0) + 1);
        if (Number(application.wallet_used_amount ?? 0) > 0) {
          walletOrders += 1;
        }
      }

      const totalCustomers = userOrderCounts.size;
      const repeatCustomers = Array.from(userOrderCounts.values()).filter((count) => count > 1).length;
      repeatCustomerPercent = totalCustomers ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
      walletConversionPercent = applicationData?.length ? Math.round((walletOrders / applicationData.length) * 100) : 0;
    } catch (error) {
      console.error("[admin-wallet] Failed to load wallet data", error);
      dataUnavailable = true;
    }
  } else {
    dataUnavailable = true;
  }

  // Build user lookup map for resolving names in transaction rows
  const userMap = new Map(customers.map((c) => [c.id, c]));

  function getUserLabel(userId: string | null | undefined) {
    if (!userId) return "—";
    const profile = userMap.get(userId);
    if (!profile) return userId.slice(0, 8) + "…";
    return [profile.full_name, profile.mobile, profile.email].filter(Boolean).join(" / ");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="DigiWallet"
        title="Wallet & Rewards"
        description="Canonical reward wallet ledger. Balance is traceable through wallet_transactions; manual adjustments are admin-controlled."
      />

      {dataUnavailable ? (
        <AdminUnderSetup title="DigiWallet is under setup" description="Wallet, cashback, or reward transaction tables are not available yet. The route is working and will populate once the database is ready." />
      ) : null}

      {!dataUnavailable ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total Cashback Issued" value={safeCurrency(totalIssued)} icon="gift" tone="orange" />
        <AdminStatCard title="Total Redeemed" value={safeCurrency(totalRedeemed)} icon="wallet" tone="blue" />
        <AdminStatCard title="Total Referrals" value={String(totalReferrals)} icon="repeat" tone="green" />
        <AdminStatCard title="Referral Rewards" value={safeCurrency(totalReferralRewards)} icon="badgePercent" tone="slate" />
      </section> : null}

      {/* Additional row of stats */}
      {!dataUnavailable ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Repeat Customer %" value={`${repeatCustomerPercent}%`} icon="repeat" tone="green" />
        <AdminStatCard title="Wallet Conversion %" value={`${walletConversionPercent}%`} icon="badgePercent" tone="slate" />
      </section> : null}

      {!dataUnavailable ? <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="rounded-2xl p-5">
            <h2 className="text-lg font-bold text-slate-950">Manual Wallet Controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Add bonuses or remove balance with a mandatory ledger reason. Negative balances are blocked server-side.</p>
            <div className="mt-4">
              <AdminWalletAdjustmentForm customers={customers} />
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="font-bold text-slate-950">Fraud Controls</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Freeze wallet usage or mark an account suspicious.</p>
              <div className="mt-4">
                <AdminWalletStatusForm customers={customers} />
              </div>
            </div>
          </Card>

          {/* Customer Wallet Balances */}
          <Card className="rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Balances</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">Customer Wallet Balances</h2>
            <div className="mt-4 max-h-[400px] overflow-y-auto">
              {walletBalances.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No wallet balances yet.</p>
              ) : (
                <div className="grid gap-1.5">
                  {walletBalances.slice(0, 50).map((wb) => (
                    <div key={wb.user_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                      <span className="truncate font-bold text-slate-700">{getUserLabel(wb.user_id)}</span>
                      <span className={`font-extrabold ${Number(wb.balance) > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                        {safeCurrency(wb.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Referral Relationships */}
          <Card className="rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Referrals</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">Referral Relationships</h2>
            <div className="mt-4 max-h-[400px] overflow-y-auto">
              {referralEvents.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No referrals yet.</p>
              ) : (
                <div className="grid gap-1.5">
                  {referralEvents.slice(0, 50).map((ref) => (
                    <div key={ref.id} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700">
                            <span className="text-blue-600">Referrer:</span> {getUserLabel(ref.referrer_user_id)}
                          </p>
                          <p className="mt-0.5 font-bold text-slate-600">
                            <span className="text-orange-600">Referred:</span> {getUserLabel(ref.referred_user_id)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            ref.referrer_reward_status === "credited" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {ref.referrer_reward_status}
                          </span>
                          <p className="mt-1 text-[10px] text-slate-400">{formatDate(ref.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Ledger</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">All wallet transactions</h2>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-3">Date</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Credit/Debit</th>
                  <th className="py-3">Balance After</th>
                  <th className="py-3">Note</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => {
                  const txAny = transaction as Record<string, unknown>;
                  return (
                    <tr key={transaction.id}>
                      <td className="py-3 font-medium text-slate-700 whitespace-nowrap">{formatDate(transaction.created_at)}</td>
                      <td className="py-3 text-slate-700 max-w-[160px] truncate">{getUserLabel(String(txAny.user_id ?? ""))}</td>
                      <td className="py-3 text-slate-600 whitespace-nowrap">{transaction.type.replace(/_/g, " ")}</td>
                      <td className={`py-3 font-extrabold whitespace-nowrap ${getRewardDirection(transaction.type) === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                        {getRewardDirection(transaction.type) === "credit" ? "+" : "-"}{safeCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 font-bold text-slate-600 whitespace-nowrap">{safeCurrency(txAny.balance_after as number ?? 0)}</td>
                      <td className="py-3 text-slate-500 max-w-[200px] truncate text-xs">{transaction.note || transaction.description || "—"}</td>
                      <td className="py-3 font-bold text-slate-600">{transaction.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No wallet transactions yet.</p> : null}
          </div>
        </Card>
      </section> : null}
    </div>
  );
}
