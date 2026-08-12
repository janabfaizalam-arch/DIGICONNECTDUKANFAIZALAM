import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { OtpTestSendPanel } from "@/components/admin/otp-test-send-panel";
import { Card } from "@/components/ui/card";
import { loadOtpDiagnostics } from "@/lib/admin/otp-diagnostics-data";
import { safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SEVERITY_CLASS: Record<string, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  idle: "border-slate-200 bg-slate-50 text-slate-800",
  blind: "border-amber-200 bg-amber-50 text-amber-900",
  broken: "border-rose-200 bg-rose-50 text-rose-900",
  misconfigured: "border-rose-200 bg-rose-50 text-rose-900",
};

const TONE_CLASS: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-100",
  bad: "bg-rose-50 text-rose-700 border-rose-100",
  warn: "bg-amber-50 text-amber-700 border-amber-100",
  muted: "bg-slate-100 text-slate-600 border-slate-200",
};

function YesNo({ value, yes, no }: { value: boolean; yes?: string; no?: string }) {
  return (
    <span className={`font-bold ${value ? "text-emerald-700" : "text-rose-700"}`}>
      {value ? (yes ?? "Configured") : (no ?? "Missing")}
    </span>
  );
}

export default async function AdminOtpDiagnosticsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { config, attempts, summary, health, loadError } = await loadOtpDiagnostics();
  const contract = config.payloadContract;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="Signup OTP delivery"
        description="Why customer signup OTPs are or aren't reaching WhatsApp. AiSensy accepting a send is not the same as WhatsApp delivering it — this screen keeps the two apart."
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

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Signup attempts", value: summary.total, tone: "text-slate-900" },
          { label: "Confirmed delivered", value: summary.delivered, tone: "text-emerald-700" },
          { label: "WhatsApp rejected", value: summary.failedAtWhatsapp, tone: "text-rose-700" },
          { label: "Delivery unknown", value: summary.acceptedOnly, tone: "text-amber-700" },
        ].map((tile) => (
          <Card key={tile.label} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{tile.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${tile.tone}`}>{tile.value}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Configuration</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">AiSensy API key</dt>
            <dd><YesNo value={config.apiKeyConfigured} /></dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Signup campaign</dt>
            <dd className="font-mono text-xs font-bold text-slate-900">
              {config.signupCampaign ?? <span className="text-rose-700">Missing</span>}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Campaign read from</dt>
            <dd className="font-mono text-xs text-slate-600">{config.signupCampaignSource ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Delivery webhook secret</dt>
            <dd>
              <YesNo
                value={config.webhookSecretConfigured}
                no="Not set — delivery is unverifiable"
              />
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Template params sent</dt>
            <dd className="font-mono text-xs font-bold text-slate-900">
              {contract.templateParamCount}
              {contract.includesExpiryParam ? " (OTP + expiry)" : " (OTP only)"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Button mode</dt>
            <dd className="font-mono text-xs font-bold text-slate-900">{contract.buttonMode}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Destination format</dt>
            <dd className="font-mono text-xs font-bold text-slate-900">{contract.destinationFormat}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-600">Environment</dt>
            <dd className="font-mono text-xs font-bold text-slate-900">{config.environment}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          These must match your AiSensy campaign&apos;s <span className="font-semibold">Test Campaign</span> cURL
          exactly. A template that expects one parameter but receives two is accepted by AiSensy and then dropped
          by WhatsApp — which looks identical to &ldquo;OTP nahi aaya&rdquo;.
        </p>
      </Card>

      <OtpTestSendPanel webhookConfigured={config.webhookSecretConfigured} />

      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Recent OTP attempts</h2>
          <p className="mt-1 text-xs text-slate-500">Newest first. Phone numbers are masked; codes are never stored in readable form.</p>
        </div>

        {attempts.length ? (
          <ul className="divide-y divide-slate-100">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-slate-900">{attempt.phoneMasked}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {attempt.purpose} · {safeDate(attempt.createdAt)}
                      {attempt.campaign ? ` · ${attempt.campaign}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      TONE_CLASS[attempt.classification.tone] ?? TONE_CLASS.muted
                    }`}
                  >
                    {attempt.classification.label}
                  </span>
                </div>
                {attempt.classification.detail && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{attempt.classification.detail}</p>
                )}
                {attempt.submittedMessageId && (
                  <p className="mt-1.5 break-all font-mono text-[11px] text-slate-400">
                    AiSensy id: {attempt.submittedMessageId}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">No OTP attempts recorded yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
