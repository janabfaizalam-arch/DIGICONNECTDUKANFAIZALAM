import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { CommissionActions } from "@/components/portal/commission-actions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Commission } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let commissions = [] as Commission[];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, applications(id, service_name, amount, created_at), profiles(full_name, email, mobile)")
        .order("created_at", { ascending: false });
      commissions = error ? [] : (data ?? []) as Commission[];
    } catch (error) {
      console.error("[admin-commissions] Failed to load commissions", error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Agent Commission Ledger"
        description="Monitor agent payouts, approved application commission overrides, and settle outstanding balances."
      />

      <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-2xl">
        {commissions.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-slate-50 text-slate-500">
                  <TableRow>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs">Agent Name / Email</TableHead>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs">Service</TableHead>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs text-right">Commission Amount</TableHead>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs">Status</TableHead>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs">Earned Date</TableHead>
                    <TableHead className="px-5 py-3 font-bold uppercase tracking-[0.12em] text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {commissions.map((commission) => (
                    <TableRow key={commission.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-5 py-4 font-bold text-slate-950">
                        {commission.profiles?.full_name || commission.profiles?.email || "Agent"}
                        {commission.profiles?.email && (
                          <span className="block font-mono text-xs font-semibold text-slate-500 mt-0.5">{commission.profiles.email}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-slate-700 font-medium">
                        {commission.applications?.service_name ?? "Not available"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right font-mono font-bold text-slate-950">
                        {safeCurrency(commission.amount)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          commission.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {commission.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-mono text-xs text-slate-500">
                        {safeDate(commission.created_at)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <CommissionActions commissionId={commission.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {commissions.map((commission) => (
                <div key={commission.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{commission.profiles?.full_name || "Agent"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{commission.profiles?.email || commission.agent_id}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      commission.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {commission.status}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{commission.applications?.service_name ?? "-"}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</p>
                      <p className="text-lg font-mono font-bold text-slate-950 mt-0.5">{safeCurrency(commission.amount)}</p>
                    </div>
                    <CommissionActions commissionId={commission.id} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-slate-50">
            <p className="text-sm font-semibold text-slate-500">No commissions recorded in the ledger.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
