import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard, AdminUnderSetup } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isSuperAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DiagnosticRow = {
  issue_type: string;
  user_id: string | null;
  application_id: string | null;
  referral_event_id: string | null;
  details: Record<string, unknown> | null;
};

export default async function AdminRewardDiagnosticsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isSuperAdminRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  let diagnostics: DiagnosticRow[] = [];
  let dataUnavailable = false;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("reward_wallet_diagnostics")
        .select("*")
        .limit(500);

      if (error) {
        dataUnavailable = true;
      }

      diagnostics = (data ?? []) as DiagnosticRow[];
    } catch (error) {
      console.error("[reward-diagnostics] Failed to load diagnostics", error);
      dataUnavailable = true;
    }
  } else {
    dataUnavailable = true;
  }

  const issueCounts = diagnostics.reduce<Record<string, number>>((grouped, row) => {
    grouped[row.issue_type] = (grouped[row.issue_type] ?? 0) + 1;
    return grouped;
  }, {});

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Reward integrity"
        title="Reward Diagnostics"
        description="Find wallet balance mismatches, missing referral rewards, legacy balances that need migration, and completed paid applications missing cashback."
      />

      {dataUnavailable ? (
        <AdminUnderSetup title="Reward diagnostics need the latest migration" description="Apply the canonical reward wallet migration to enable the diagnostics view." />
      ) : null}

      {!dataUnavailable ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard title="Open Issues" value={diagnostics.length} icon="listChecks" tone={diagnostics.length ? "orange" : "green"} />
            <AdminStatCard title="Legacy Not Migrated" value={issueCounts.legacy_wallet_balance_not_migrated ?? 0} icon="wallet" tone="slate" />
            <AdminStatCard title="Cashback Missing" value={issueCounts.completed_application_cashback_missing ?? 0} icon="badgePercent" tone="orange" />
            <AdminStatCard title="Referral Bonus Missing" value={(issueCounts.referrer_signup_bonus_missing ?? 0) + (issueCounts.referrer_first_service_bonus_missing ?? 0)} icon="gift" tone="blue" />
          </section>

          <Card className="rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Diagnostics</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-3">Issue</th>
                    <th className="py-3">User</th>
                    <th className="py-3">Application</th>
                    <th className="py-3">Referral Event</th>
                    <th className="py-3">Details</th>
                    <th className="py-3">Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diagnostics.map((row, index) => (
                    <tr key={`${row.issue_type}-${row.user_id ?? "none"}-${row.application_id ?? "none"}-${row.referral_event_id ?? "none"}-${index}`}>
                      <td className="py-3 font-bold text-slate-800">{row.issue_type.replace(/_/g, " ")}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{row.user_id ?? "-"}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{row.application_id ?? "-"}</td>
                      <td className="py-3 font-mono text-xs text-slate-500">{row.referral_event_id ?? "-"}</td>
                      <td className="py-3 font-mono text-xs text-slate-600">{JSON.stringify(row.details ?? {})}</td>
                      <td className="py-3 text-slate-600">{safeDate(new Date().toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {diagnostics.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">No reward integrity issues found.</p> : null}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
