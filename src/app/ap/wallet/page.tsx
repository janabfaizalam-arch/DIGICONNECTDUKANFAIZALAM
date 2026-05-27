import { redirect } from "next/navigation";
import { Wallet, Landmark, QrCode, ArrowDownRight, FileText, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAPWalletLedger, getAPPayouts, getAPWalletBalance, getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { PayoutRequestForm } from "@/components/ap/payout-request-form";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function APWalletPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const [balance, ledger, payouts] = await Promise.all([
    getAPWalletBalance(ap.id),
    getAPWalletLedger(ap.id),
    getAPPayouts(ap.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-400">
            Agency Partner Wallet
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Wallet & Ledger Console
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm">
            Withdraw earned commissions to bank, track manual ledger adjustments, and review payout transaction logs.
          </p>
        </div>

        {/* Top Section: Wallet + Bank Details + Payout Form */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Balance Card */}
          <Card className="relative overflow-hidden border border-white/5 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between min-h-[220px]">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-[50px] pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Wallet className="h-6 w-6" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                Ledger Balance
              </span>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-xs font-semibold text-slate-500">Available Wallet Balance</p>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight text-white mt-1">
                {formatCurrency(balance)}
              </h3>
            </div>
          </Card>

          {/* Card 2: Bank details snapshot */}
          <Card className="border border-white/5 bg-slate-900/20 p-6 rounded-3xl backdrop-blur-md space-y-4">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-blue-400" />
              Settlement Account
            </h3>
            {ap.bank_account_number ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block">Bank Name</span>
                  <span className="text-slate-200 text-sm font-semibold">{ap.bank_name || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Account Holder</span>
                    <span className="text-slate-200 truncate block">{ap.bank_account_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IFSC Code</span>
                    <span className="text-slate-200 block">{ap.bank_ifsc || "—"}</span>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Account Number</span>
                    <span className="text-slate-200 text-sm">•••• {ap.bank_account_number.slice(-4)}</span>
                  </div>
                  {ap.upi_id && (
                    <div className="text-right">
                      <span className="text-slate-500 block">UPI ID</span>
                      <span className="text-indigo-400 font-semibold text-xs block">{ap.upi_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-sm">
                No bank account details configured. Please update your profile.
              </div>
            )}
          </Card>

          {/* Card 3: Payout Request Form */}
          <Card className="border border-white/5 bg-slate-900/20 p-6 rounded-3xl backdrop-blur-md">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2 mb-4">
              <QrCode className="h-4.5 w-4.5 text-indigo-400" />
              Initiate Payout
            </h3>
            <PayoutRequestForm availableBalance={balance} />
          </Card>
        </div>

        {/* Ledger & Payout History logs */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payout History requests log */}
          <Card className="border border-white/5 bg-slate-900/20 p-5 md:p-6 rounded-3xl backdrop-blur-md overflow-hidden space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-400" />
              Payout Request History
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {payouts.length ? (
                payouts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/5 bg-slate-950 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-white">{formatCurrency(p.amount)}</span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          p.status === "paid"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : p.status === "failed" || p.status === "cancelled"
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.payment_reference && (
                      <p className="font-mono text-[10px] text-slate-500">
                        Ref: <span className="text-slate-400">{p.payment_reference}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Requested: {formatDate(p.requested_at)}</span>
                      {p.paid_at && <span>Paid: {formatDate(p.paid_at)}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No payout request transactions initiated yet.</p>
              )}
            </div>
          </Card>

          {/* Ledger History logs */}
          <Card className="border border-white/5 bg-slate-900/20 p-5 md:p-6 rounded-3xl backdrop-blur-md overflow-hidden space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Wallet Ledger Entries (Append-only)
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {ledger.length ? (
                ledger.map((l) => {
                  const isDebit = ["manual_debit", "payout_deduction", "penalty", "reversal"].includes(l.entry_type);

                  return (
                    <div key={l.id} className="rounded-xl border border-white/5 bg-slate-950 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-400 capitalize">
                          {l.entry_type.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-1">
                          {isDebit ? (
                            <ArrowDownRight className="h-4.5 w-4.5 text-rose-400 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                          )}
                          <span className={`text-base font-extrabold ${isDebit ? "text-rose-400" : "text-emerald-400"}`}>
                            {isDebit ? "-" : "+"}
                            {formatCurrency(l.amount)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">{l.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                        <span>Balance: {formatCurrency(l.running_balance)}</span>
                        <span className="font-mono">{formatDate(l.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No ledger entry logs recorded yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
