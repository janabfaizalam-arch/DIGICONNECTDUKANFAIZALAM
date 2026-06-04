import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgePercent, Gift, Sparkles, Trophy, Users, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { getCustomerWalletData, type CustomerWalletTransaction } from "@/lib/customer-wallet-data";
import { formatCurrency } from "@/lib/portal-data";
import { ReferralShareButton } from "@/components/portal/referral-copy-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reward Wallet | DigiConnect Dukan",
  description: "View your DigiConnect Dukan reward wallet balance, referral rewards, and transaction history.",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

function transactionKind(transaction: CustomerWalletTransaction) {
  if (transaction.type.includes("first_service_cashback")) return "first cashback";
  if (transaction.type.includes("cashback")) return "cashback";
  if (transaction.type.includes("signup_bonus") && !transaction.type.includes("referrer")) return "signup bonus";
  if (transaction.type.includes("referral") || transaction.type.includes("referrer")) return "referral";
  return transaction.direction === "debit" ? "debit" : "credit";
}

function transactionIcon(transaction: CustomerWalletTransaction) {
  if (transaction.type.includes("cashback")) return "💰";
  if (transaction.type.includes("signup")) return "🎁";
  if (transaction.type.includes("referral") || transaction.type.includes("referrer")) return "👥";
  if (transaction.type.includes("redeem")) return "🛒";
  return transaction.direction === "debit" ? "📤" : "📥";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function referenceLabel(transaction: CustomerWalletTransaction) {
  return transaction.note || transaction.application_id || transaction.idempotency_key || "Wallet transaction";
}

export default async function CustomerWalletPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  const wallet = await getCustomerWalletData(user.id);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Header */}
        <section className="rounded-[1.5rem] border border-white/85 bg-white/84 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] md:p-6">
          <Link href="/customer/dashboard" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-700">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-orange-600">Reward Wallet</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">{formatCurrency(wallet.balance)}</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">Use wallet and save up to 50% on every service.</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section aria-label="Wallet totals" className="grid gap-2.5 sm:grid-cols-3">
          {[
            { label: "Current Balance", value: wallet.balance, icon: WalletCards, color: "text-blue-700" },
            { label: "Total Earned", value: wallet.totalEarned, icon: Trophy, color: "text-emerald-700" },
            { label: "Total Used", value: wallet.totalUsed, icon: BadgePercent, color: "text-orange-700" },
          ].map(({ label, value, icon: Icon, color }) => (
            <article key={label} className="rounded-2xl border border-white/85 bg-white/84 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-xs font-bold text-slate-500">{label}</p>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{formatCurrency(Number(value))}</p>
            </article>
          ))}
        </section>

        {/* Cashback Info Banner */}
        <section className="rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/90 to-blue-50/90 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.03)]">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-1.5">
              <p className="text-sm font-extrabold text-slate-950">Earn cashback on every service!</p>
              <div className="grid gap-1 text-xs font-semibold text-slate-600">
                {!wallet.isFirstServiceCashbackUsed ? (
                  <p className="flex items-center gap-1.5">
                    <span className="inline-flex h-5 min-w-[3.5rem] items-center justify-center rounded-full bg-emerald-600 px-2 text-[10px] font-extrabold text-white">100%</span>
                    First service cashback on fresh payment amount
                  </p>
                ) : null}
                <p className="flex items-center gap-1.5">
                  <span className="inline-flex h-5 min-w-[3.5rem] items-center justify-center rounded-full bg-blue-600 px-2 text-[10px] font-extrabold text-white">20%</span>
                  Regular cashback on every fresh payment
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Cashback is calculated only on fresh amount paid (wallet redeem is excluded).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral Section */}
        {wallet.referralCode ? (
          <section className="rounded-[1.5rem] border border-orange-100/80 bg-gradient-to-br from-orange-50/90 via-white to-blue-50/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <Gift className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-orange-600">Refer &amp; Earn</p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  Earn ₹100 when your friend signs up + ₹100 when they complete their first service!
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Your friend gets ₹500 signup bonus wallet credit.</p>

                {/* Referral Code Display */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-bold text-slate-500">Your Code:</span>
                    <span className="font-mono text-sm font-extrabold tracking-wide text-blue-700">{wallet.referralCode}</span>
                  </div>
                  <ReferralShareButton code={wallet.referralCode} link={wallet.referralLink} />
                </div>
              </div>
            </div>

            {/* Referral Stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white/70 p-3 text-center">
                <p className="text-lg font-extrabold text-slate-950">{wallet.referralCount}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Total Referrals</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3 text-center">
                <p className="text-lg font-extrabold text-emerald-700">{formatCurrency(wallet.referralEarned)}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Earned</p>
              </div>
              <div className="col-span-2 rounded-xl bg-white/70 p-3 text-center sm:col-span-1">
                <p className="text-lg font-extrabold text-orange-700">{wallet.referrals.filter((r) => r.status === "pending").length}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">Pending</p>
              </div>
            </div>

            {/* Referral History */}
            {wallet.referrals.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-600">Referral History</p>
                <div className="mt-2 grid gap-1.5">
                  {wallet.referrals.slice(0, 10).map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">Referred User</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${referral.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {referral.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {referral.reward_amount > 0 ? (
                          <span className="font-extrabold text-emerald-700">+{formatCurrency(referral.reward_amount)}</span>
                        ) : null}
                        <span className="text-slate-400">{formatDate(referral.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Transaction History */}
        <section className="rounded-[1.5rem] border border-white/85 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] md:p-6">
          <h2 className="text-lg font-bold text-slate-950">Wallet Transactions</h2>
          {!wallet.transactions.length ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">No wallet transactions yet.</p>
          ) : (
            <div className="mt-4 grid gap-2.5">
              {wallet.transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base">{transactionIcon(transaction)}</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-blue-700">
                          {transactionKind(transaction)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-600">
                          {statusLabel(transaction.status)}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-sm font-bold text-slate-950">{referenceLabel(transaction)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(transaction.created_at)}</p>
                    </div>
                    <p className={`text-base font-extrabold ${transaction.direction === "debit" ? "text-orange-700" : "text-emerald-700"}`}>
                      {transaction.direction === "debit" ? "-" : "+"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
