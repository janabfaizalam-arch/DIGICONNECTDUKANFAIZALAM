import { redirect } from "next/navigation";
import { BadgePercent, Gift, Repeat2, WalletCards } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminWalletAdjustmentForm } from "@/components/admin/admin-wallet-adjustment-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { WalletTransaction } from "@/lib/wallet";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminWalletPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let transactions: WalletTransaction[] = [];
  let customers: { id: string; full_name: string | null; email: string | null }[] = [];
  let totalIssued = 0;
  let totalRedeemed = 0;
  let repeatCustomerPercent = 0;
  let walletConversionPercent = 0;

  if (supabase) {
    const [{ data: transactionData }, { data: customerData }, { data: applicationData }] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("id, full_name, email").eq("role", "customer").order("full_name", { ascending: true }),
      supabase.from("applications").select("user_id, wallet_used_amount, status").not("user_id", "is", null).limit(2000),
    ]);

    transactions = (transactionData ?? []) as WalletTransaction[];
    customers = (customerData ?? []) as typeof customers;
    totalIssued = transactions
      .filter((transaction) => transaction.direction === "credit" && transaction.transaction_type !== "refund_adjustment")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
    totalRedeemed = transactions
      .filter((transaction) => transaction.direction === "debit")
      .reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);

    const userOrderCounts = new Map<string, number>();
    let walletOrders = 0;
    for (const application of applicationData ?? []) {
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
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="DigiWallet"
        title="Cashback Analytics"
        description="Monitor wallet issuance, redemptions, customer repeat behavior, and manual adjustments."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total Cashback Issued" value={formatCurrency(totalIssued)} icon={Gift} tone="orange" />
        <AdminStatCard title="Total Redeemed" value={formatCurrency(totalRedeemed)} icon={WalletCards} tone="blue" />
        <AdminStatCard title="Repeat Customer %" value={`${repeatCustomerPercent}%`} icon={Repeat2} tone="green" />
        <AdminStatCard title="Wallet Conversion %" value={`${walletConversionPercent}%`} icon={BadgePercent} tone="slate" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="rounded-2xl p-5">
          <h2 className="text-lg font-bold text-slate-950">Manual Wallet Adjustment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Add bonuses or remove balance with a refund adjustment. Negative balances are blocked server-side.</p>
          <div className="mt-4">
            <AdminWalletAdjustmentForm customers={customers} />
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Ledger</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">All wallet transactions</h2>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="py-3">Date</th>
                  <th className="py-3">Service</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Credit/Debit</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="py-3 font-medium text-slate-700">{formatDate(transaction.created_at)}</td>
                    <td className="py-3 text-slate-700">{transaction.service_name || "DigiWallet"}</td>
                    <td className="py-3 text-slate-600">{transaction.transaction_type.replace(/_/g, " ")}</td>
                    <td className={`py-3 font-extrabold ${transaction.direction === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                      {transaction.direction === "credit" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="py-3 font-bold text-slate-600">{transaction.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No wallet transactions yet.</p> : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
