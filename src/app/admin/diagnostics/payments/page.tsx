import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { Card } from "@/components/ui/card";
import { AUTHORIZED_MONEY_EXPLAINER } from "@/lib/admin/payment-diagnostics-core";
import { loadPaymentDiagnostics } from "@/lib/admin/payment-diagnostics-data";
import { safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SEVERITY_CLASS: Record<string, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  idle: "border-slate-200 bg-slate-50 text-slate-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  blind: "border-amber-200 bg-amber-50 text-amber-900",
  misconfigured: "border-rose-200 bg-rose-50 text-rose-900",
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPaymentDiagnosticsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/admin/login");
  if (!isAdminRole(role)) redirect("/unauthorized");

  const { config, activity, gaps, stuckPayments, health, loadError } = await loadPaymentDiagnostics();

  return (
    <PageContainer width="form" className="space-y-6">
      <AdminPageHeader
        eyebrow="Payments"
        title="Razorpay health"
        description="Why a payment did or did not reach your Razorpay account. A customer being charged is not the same as the money arriving — this screen keeps the two apart."
      />

      <Card className={`rounded-2xl border p-5 shadow-sm ${SEVERITY_CLASS[health.severity] ?? SEVERITY_CLASS.idle}`}>
        <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">Current verdict</p>
        <h2 className="mt-1 text-lg font-bold">{health.headline}</h2>
        <p className="mt-2 text-sm leading-relaxed">{health.explanation}</p>

        {health.nextSteps.length > 0 && (
          <ol className="mt-4 space-y-2 border-t border-current/15 pt-4">
            {health.nextSteps.map((step, index) => (
              <li key={step} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/15 text-xs font-bold">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {loadError && (
        <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-800">{loadError}</p>
        </Card>
      )}

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Which Razorpay account is this site using?</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Open Razorpay → Account &amp; Settings → API Keys and compare. If the key id there is different, you are
          looking at a different account than the one taking your payments, and its dashboard will always look empty.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Key id in use</p>
          <p className="mt-1 break-all font-mono text-sm font-bold text-slate-900">{config.keyId ?? "not set"}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            Mode:{" "}
            <span className={config.mode === "live" ? "text-emerald-700" : "text-rose-700"}>
              {config.mode === "live" ? "Live — real money" : config.mode === "test" ? "Test — no real money" : "unknown"}
            </span>
            {"  ·  "}Environment: {config.environment}
          </p>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Key secret</dt>
            <dd className={`text-sm font-bold ${config.keySecretConfigured ? "text-emerald-700" : "text-rose-700"}`}>
              {config.keySecretConfigured ? "Configured" : "Missing"}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Webhook secret</dt>
            <dd className={`text-sm font-bold ${config.webhookSecretConfigured ? "text-emerald-700" : "text-rose-700"}`}>
              {config.webhookSecretConfigured ? "Configured" : "Missing"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 break-all text-xs text-slate-500">
          Webhook URL Razorpay should be calling: <span className="font-mono">{config.webhookUrl}</span>
        </p>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Is Razorpay talking to us?</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          The last delivery is read from the records a webhook writes, so it is proof of a real call — not of the
          dashboard&apos;s own log.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Last webhook received"
            value={activity.lastWebhookAt ? safeDate(activity.lastWebhookAt) : "never"}
            hint="Silence here while orders are being started points at the webhook URL, its events, or a different account."
          />
          <Stat label="Orders started (30 days)" value={activity.recentOrdersStarted} />
          <Stat label="Captured (30 days)" value={activity.recentPaymentsCaptured} hint="Money that actually arrived." />
          <Stat label="Failed (30 days)" value={activity.recentPaymentsFailed} />
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Orders that need attention</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label="Held, never captured" value={gaps.stuckAuthorized} hint={AUTHORIZED_MONEY_EXPLAINER} />
          <Stat label="Paid, no invoice" value={gaps.paidMissingInvoice} />
          <Stat label="Wallet used, never debited" value={gaps.paidMissingWalletDebit} />
          <Stat label="Paid, cashback not credited" value={gaps.paidMissingCashback} />
        </div>

        {stuckPayments.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Held payments</p>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3 font-bold">Payment id</th>
                  <th className="py-2 pr-3 font-bold">Service</th>
                  <th className="py-2 pr-3 font-bold">Amount</th>
                  <th className="py-2 font-bold">When</th>
                </tr>
              </thead>
              <tbody>
                {stuckPayments.map((payment) => (
                  <tr key={payment.paymentId ?? payment.orderId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-mono text-xs">{payment.paymentId ?? "—"}</td>
                    <td className="py-2 pr-3">{payment.serviceName ?? "—"}</td>
                    <td className="py-2 pr-3 font-semibold">₹{payment.amount.toFixed(2)}</td>
                    <td className="py-2 text-xs text-slate-500">{payment.paidAt ? safeDate(payment.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Search any of these ids in Razorpay → Transactions → Payments to see its real state. If one reads
              Captured there, the money did arrive and only our record is behind — run Payments → Reconciliation for
              that day to pull it in.
            </p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
