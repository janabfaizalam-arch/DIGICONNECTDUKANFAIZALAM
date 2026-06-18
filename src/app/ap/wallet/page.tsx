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
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-600">
            DigiPartner Wallet
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Wallet & Ledger Console
          </h1>
          <p className="mt-2 text-slate-500 max-w-2xl text-sm font-medium">
            Withdraw earned commissions to bank, track manual ledger adjustments, and review payout transaction logs.
          </p>
        </div>

        {/* Top Section: Wallet + Bank Details + Payout Form */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1: Balance Card */}
          <Card className="relative overflow-hidden border border-slate-200/50 bg-white/70 p-6 rounded-3xl backdrop-blur-md flex flex-col justify-between min-h-[220px] shadow-sm">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-[50px] pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                <Wallet className="h-6 w-6" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                Ledger Balance
              </span>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-xs font-semibold text-slate-500">Available Wallet Balance</p>
              <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-905 mt-1">
                {formatCurrency(balance)}
              </h3>
            </div>
          </Card>

          {/* Card 2: Bank details snapshot */}
          <Card className="border border-slate-200/50 bg-white/70 p-6 rounded-3xl backdrop-blur-md space-y-4 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-blue-600" />
              Settlement Account
            </h3>
            {ap.bank_account_number ? (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Bank Name</span>
                  <span className="text-slate-800 text-sm font-bold">{ap.bank_name || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-semibold">Account Holder</span>
                    <span className="text-slate-850 truncate block font-bold">{ap.bank_account_name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">IFSC Code</span>
                    <span className="text-slate-850 block font-bold">{ap.bank_ifsc || "—"}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block font-semibold">Account Number</span>
                    <span className="text-slate-850 text-sm font-bold">•••• {ap.bank_account_number.slice(-4)}</span>
                  </div>
                  {ap.upi_id && (
                    <div className="text-right">
                      <span className="text-slate-400 block font-semibold">UPI ID</span>
                      <span className="text-indigo-600 font-bold text-xs block">{ap.upi_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-sm font-medium">
                No bank account details configured. Please update your profile.
              </div>
            )}
          </Card>

          {/* Card 3: Payout Request Form */}
          <Card className="border border-slate-200/50 bg-white/70 p-6 rounded-3xl backdrop-blur-md shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 mb-4">
              <QrCode className="h-4.5 w-4.5 text-indigo-600" />
              Initiate Payout
            </h3>
            <PayoutRequestForm availableBalance={balance} />
          </Card>
        </div>

        {/* Ledger & Payout History logs */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payout History requests log */}
          <Card className="border border-slate-200/50 bg-white/70 p-5 md:p-6 rounded-3xl backdrop-blur-md overflow-hidden space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-600" />
              Payout Request History
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {payouts.length ? (
                payouts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200/50 bg-white/50 p-4 space-y-2 hover:bg-white hover:border-slate-300 transition-all duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-slate-900">{formatCurrency(p.amount)}</span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          p.status === "paid"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : p.status === "failed" || p.status === "cancelled"
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.payment_reference && (
                      <p className="font-mono text-[10px] text-slate-400">
                        Ref: <span className="text-slate-600 font-semibold">{p.payment_reference}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Requested: {formatDate(p.requested_at)}</span>
                      {p.paid_at && <span>Paid: {formatDate(p.paid_at)}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 font-medium text-center py-8">No payout request transactions initiated yet.</p>
              )}
            </div>
          </Card>

          {/* Ledger History logs */}
          <Card className="border border-slate-200/50 bg-white/70 p-5 md:p-6 rounded-3xl backdrop-blur-md overflow-hidden space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Wallet Ledger Entries (Append-only)
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {ledger.length ? (
                ledger.map((l) => {
                  const isDebit = ["manual_debit", "payout_deduction", "penalty", "reversal"].includes(l.entry_type);

                  return (
                    <div key={l.id} className="rounded-xl border border-slate-200/50 bg-white/50 p-4 space-y-2 hover:bg-white hover:border-slate-300 transition-all duration-150">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-500 capitalize">
                          {l.entry_type.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-1">
                          {isDebit ? (
                            <ArrowDownRight className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          )}
                          <span className={`text-base font-extrabold ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                            {isDebit ? "-" : "+"}
                            {formatCurrency(l.amount)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-normal">{l.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                        <span>Balance: {formatCurrency(l.running_balance)}</span>
                        <span className="font-mono">{formatDate(l.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400 font-medium text-center py-8">No ledger entry logs recorded yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
