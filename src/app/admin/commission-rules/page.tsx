import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { CommissionRuleActions } from "@/components/admin/commission-rule-actions";
import { CommissionRuleForm } from "@/components/admin/commission-rule-form";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCommissionRules } from "@/lib/admin/commission-rules-data";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { SCOPE_LABELS } from "@/lib/commission-rules";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SCOPE_CLASS: Record<string, string> = {
  partner: "bg-violet-50 text-violet-700 border-violet-100",
  campaign: "bg-amber-50 text-amber-700 border-amber-100",
  service: "bg-blue-50 text-blue-700 border-blue-100",
  tier: "bg-teal-50 text-teal-700 border-teal-100",
  global: "bg-slate-100 text-slate-700 border-slate-200",
};

export default async function AdminCommissionRulesPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { rows, options, hasGlobalFallback, activeCount } = await listCommissionRules();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Commission Rules"
        description="What a partner earns on a sale. Every completed sale is priced against the first matching rule — partner, then campaign, then service, then tier, then the global fallback. A sale that matches nothing earns nothing and records no commission at all."
      />

      {!hasGlobalFallback ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">No active global fallback rule</p>
              <p className="text-sm font-medium text-amber-800">
                Any sale that does not match a partner, campaign, service or tier rule will earn ₹0 and write no
                commission row — the partner sees nothing in their panel and nothing reaches their wallet. Add a
                global rule so no sale can fall through.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {activeCount} active rule{activeCount === 1 ? "" : "s"} · {rows.length} total
        </p>
        <CommissionRuleForm options={options} />
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {rows.length === 0 ? (
          <div className="space-y-2 p-10 text-center">
            <p className="text-sm font-bold text-slate-900">No commission rules yet</p>
            <p className="mx-auto max-w-xl text-sm font-medium text-slate-600">
              Until at least one rule exists, every completed sale prices at ₹0 and no partner can earn or withdraw.
              Start with a global fallback, then add partner or service rules on top of it.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <p className="font-bold text-slate-900">{rule.name}</p>
                      {rule.description ? (
                        <p className="text-xs font-medium text-slate-500">{rule.description}</p>
                      ) : null}
                      <p className="text-[11px] font-semibold text-slate-400">Priority {rule.priority}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SCOPE_CLASS[rule.scopeType] ?? SCOPE_CLASS.global}`}
                      >
                        {SCOPE_LABELS[rule.scopeType]}
                      </span>
                      {rule.scopeTarget ? (
                        <p className="mt-1 text-xs font-semibold text-slate-600">{rule.scopeTarget}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold text-slate-900">{rule.payout}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {rule.minAmount > 0 ? <span>Min {safeCurrency(rule.minAmount)}</span> : null}
                      {rule.minAmount > 0 && rule.maxAmount !== null ? " · " : null}
                      {rule.maxAmount !== null ? <span>Max {safeCurrency(rule.maxAmount)}</span> : null}
                      {rule.minAmount === 0 && rule.maxAmount === null ? "—" : null}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {rule.validFrom || rule.validUntil ? (
                        <>
                          {rule.validFrom ? safeDate(rule.validFrom) : "Always"} →{" "}
                          {rule.validUntil ? safeDate(rule.validUntil) : "Always"}
                        </>
                      ) : (
                        "Always"
                      )}
                    </TableCell>
                    <TableCell>
                      {rule.expired ? (
                        <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                          Expired
                        </span>
                      ) : rule.isActive ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <CommissionRuleActions ruleId={rule.id} ruleName={rule.name} isActive={rule.isActive} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs font-medium text-slate-500">
        Priced commissions land in{" "}
        <Link href="/admin/ap-commissions" className="font-bold text-[var(--primary)] underline">
          Partner Commissions
        </Link>{" "}
        as <span className="font-bold">pending</span>. Approving there credits the partner&apos;s wallet, and they can
        then request a payout from{" "}
        <Link href="/admin/ap-payouts" className="font-bold text-[var(--primary)] underline">
          Partner Payouts
        </Link>
        .
      </p>
    </div>
  );
}
