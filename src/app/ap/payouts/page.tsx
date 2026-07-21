import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, Clock3, HandCoins, Wallet } from "lucide-react";

import { PayoutRequestForm } from "@/components/ap/payout-request-form";
import { EmptyState, GlassPanel, MetricCard, PageHeader, StatusBadge } from "@/components/ap/ui";
import { summarizePayouts } from "@/lib/ap/finance";
import { formatINR } from "@/lib/ap/format";
import { getAgencyPartnerByUserId, getAPPayouts, getAPWalletBalance } from "@/lib/ap-data";
import { AP_PAYOUT_STATUS_LABELS } from "@/lib/ap-types";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatDateTime(date: string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function APPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const [balance, payouts] = await Promise.all([
    getAPWalletBalance(ap.id),
    getAPPayouts(ap.id, 500),
  ]);

  const summary = summarizePayouts(payouts, balance);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Finance"
          title="Payouts"
          description="Request settlements and track payout status, payment references and processing dates."
          actions={
            <Link
              href="/ap/wallet"
              className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              Open wallet
            </Link>
          }
        />

        <section aria-label="Payout metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Available for payout" value={formatINR(summary.availableForPayout)} icon={<Wallet className="h-4 w-4" />} />
          <MetricCard label="Pending payout" value={formatINR(summary.pendingPayout)} icon={<Clock3 className="h-4 w-4" />} />
          <MetricCard label="Paid this month" value={formatINR(summary.paidThisMonth)} icon={<Banknote className="h-4 w-4" />} />
          <MetricCard label="Lifetime paid" value={formatINR(summary.lifetimePaid)} icon={<HandCoins className="h-4 w-4" />} />
        </section>

        <GlassPanel padding="md" className="max-w-xl">
          <h2 className="mb-3 text-sm font-extrabold text-slate-900">Request payout</h2>
          <PayoutRequestForm availableBalance={balance} />
        </GlassPanel>

        <section aria-labelledby="payout-history-heading" className="space-y-3">
          <h2 id="payout-history-heading" className="text-sm font-extrabold text-slate-900">
            Payout history
          </h2>

          {payouts.length === 0 ? (
            <EmptyState
              title="No payouts yet"
              description="When you request a settlement of ₹500 or more, it will appear here with status updates."
              actionLabel="Open wallet"
              actionHref="/ap/wallet"
            />
          ) : (
            <>
              <GlassPanel padding="none" className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <caption className="sr-only">Payout request history</caption>
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Processed</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">UTR / Ref</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-700">
                          {p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-extrabold tabular-nums">{formatINR(p.amount)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDateTime(p.requested_at)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                          {formatDateTime(p.paid_at || p.processed_at)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold capitalize text-slate-600">
                          {p.payment_method || "—"}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[11px] text-slate-500">
                          {p.payment_reference || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} label={AP_PAYOUT_STATUS_LABELS[p.status]} />
                        </td>
                        <td className="max-w-[180px] px-4 py-3 text-xs font-medium text-slate-500">
                          {(p.status === "failed" || p.status === "cancelled") && p.notes ? p.notes : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassPanel>

              <div className="grid gap-2.5 lg:hidden">
                {payouts.map((p) => (
                  <GlassPanel key={p.id} padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-indigo-700">{p.id.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{formatINR(p.amount)}</p>
                      </div>
                      <StatusBadge status={p.status} label={AP_PAYOUT_STATUS_LABELS[p.status]} />
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-500">
                      <p>Requested {formatDateTime(p.requested_at)}</p>
                      <p>Processed {formatDateTime(p.paid_at || p.processed_at)}</p>
                      {p.payment_reference ? <p className="font-mono">UTR {p.payment_reference}</p> : null}
                      {(p.status === "failed" || p.status === "cancelled") && p.notes ? (
                        <p className="text-rose-600">{p.notes}</p>
                      ) : null}
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
