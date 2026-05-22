import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { getCustomerWalletData, type CustomerWalletTransaction } from "@/lib/customer-wallet-data";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reward Wallet | DigiConnect Dukan",
  description: "View your DigiConnect Dukan reward wallet balance and transactions.",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

function transactionKind(transaction: CustomerWalletTransaction) {
  if (transaction.type.includes("cashback")) return "cashback";
  if (transaction.type.includes("referral") || transaction.type.includes("referrer")) return "referral";
  return transaction.direction === "debit" ? "debit" : "credit";
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
              <p className="mt-1 text-sm leading-6 text-slate-600">Wallet credits are shown from your own reward ledger.</p>
            </div>
          </div>
        </section>

        <section aria-label="Wallet totals" className="grid gap-2.5 sm:grid-cols-3">
          {[
            ["Current Balance", wallet.balance],
            ["Total Earned", wallet.totalEarned],
            ["Total Used / Withdrawn", wallet.totalUsed],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-white/85 bg-white/84 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{formatCurrency(Number(value))}</p>
            </article>
          ))}
        </section>

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
