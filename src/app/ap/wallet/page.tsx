import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Landmark, Wallet } from "lucide-react";

import { PayoutRequestForm } from "@/components/ap/payout-request-form";
import { WalletLedgerClient } from "@/components/ap/wallet-ledger-client";
import { GlassPanel, MetricCard, PageHeader } from "@/components/ap/ui";
import { summarizePayouts, summarizeWalletLedger } from "@/lib/ap/finance";
import { formatINR } from "@/lib/ap/format";
import {
  getAgencyPartnerByUserId,
  getAPPayouts,
  getAPWalletBalance,
  getAPWalletLedger,
} from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function APWalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const [balance, ledger, payouts] = await Promise.all([
    getAPWalletBalance(ap.id),
    getAPWalletLedger(ap.id, 10_000),
    getAPPayouts(ap.id, 500),
  ]);

  const walletSummary = summarizeWalletLedger(ledger);
  const payoutSummary = summarizePayouts(payouts, balance);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Finance"
          title="Wallet"
          description="Available balance, ledger activity and settlement account — amounts shown in ₹."
          actions={
            <Link
              href="/ap/payouts"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View payouts
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <section aria-label="Wallet metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Current balance" value={formatINR(balance)} icon={<Wallet className="h-4 w-4" />} hint="Ledger available" />
          <MetricCard label="Available balance" value={formatINR(walletSummary.availableBalance)} hint="Credits − debits" />
          <MetricCard label="Total credits" value={formatINR(walletSummary.totalCredits)} />
          <MetricCard label="Total debits" value={formatINR(walletSummary.totalDebits)} />
          <MetricCard label="Pending settlements" value={formatINR(payoutSummary.pendingPayout)} />
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <GlassPanel padding="md" className="space-y-3 lg:col-span-1">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Landmark className="h-4 w-4 text-indigo-600" />
              Settlement account
            </h2>
            {ap.bank_account_number ? (
              <dl className="space-y-2 text-xs font-semibold text-slate-600">
                <div>
                  <dt className="text-slate-400">Bank</dt>
                  <dd className="font-bold text-slate-800">{ap.bank_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Account holder</dt>
                  <dd className="font-bold text-slate-800">{ap.bank_account_name || "—"}</dd>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-slate-400">IFSC</dt>
                    <dd className="font-mono font-bold text-slate-800">{ap.bank_ifsc || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Account</dt>
                    <dd className="font-mono font-bold text-slate-800">•••• {ap.bank_account_number.slice(-4)}</dd>
                  </div>
                </div>
                {ap.upi_id ? (
                  <div>
                    <dt className="text-slate-400">UPI</dt>
                    <dd className="font-bold text-indigo-700">{ap.upi_id}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                No bank account on file. Update details from your profile with admin support if needed.
              </p>
            )}
          </GlassPanel>

          <GlassPanel padding="md" className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-extrabold text-slate-900">Request payout</h2>
            <PayoutRequestForm availableBalance={balance} />
            <p className="mt-3 text-[11px] font-medium text-slate-400">
              Minimum request ₹500. Pending requests must clear before a new request. Full history on{" "}
              <Link href="/ap/payouts" className="font-bold text-indigo-700 hover:underline">
                Payouts
              </Link>
              .
            </p>
          </GlassPanel>
        </div>

        <WalletLedgerClient ledger={ledger} />
      </div>
    </main>
  );
}
