import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { ApCommissionActions } from "@/components/admin/ap-commission-actions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminApCommissions } from "@/lib/admin/ap-commissions-data";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "reversed", label: "Reversed" },
] as const;

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  earned: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  paid: "bg-blue-50 text-blue-700 border-blue-100",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  reversed: "bg-rose-50 text-rose-700 border-rose-100",
  adjusted: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function AdminApCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { status } = await searchParams;
  const activeFilter = status && FILTERS.some((f) => f.value === status) ? status : "all";

  const { rows, summary } = await listAdminApCommissions({ status: activeFilter });

  const tiles = [
    { label: "Awaiting approval", count: summary.pendingCount, amount: summary.pendingAmount, tone: "text-amber-700" },
    { label: "Approved — in wallet", count: summary.approvedCount, amount: summary.approvedAmount, tone: "text-emerald-700" },
    { label: "Paid out", count: summary.paidCount, amount: summary.paidAmount, tone: "text-blue-700" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Partner Commissions"
        description="Approve partner commissions to credit their DigiWallet. Approving moves the money into the partner's balance so they can request a payout; cancelling or reversing takes it back out."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{tile.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${tile.tone}`}>{safeCurrency(tile.amount)}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {tile.count} commission{tile.count === 1 ? "" : "s"}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/admin/ap-commissions" : `/admin/ap-commissions?status=${filter.value}`}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition ${
              activeFilter === filter.value
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {rows.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-slate-50 text-slate-500">
                  <TableRow>
                    <TableHead className="px-5 py-3 text-xs font-bold uppercase tracking-[0.12em]">Partner</TableHead>
                    <TableHead className="px-5 py-3 text-xs font-bold uppercase tracking-[0.12em]">Service</TableHead>
                    <TableHead className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.12em]">Sale</TableHead>
                    <TableHead className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.12em]">Commission</TableHead>
                    <TableHead className="px-5 py-3 text-xs font-bold uppercase tracking-[0.12em]">Status</TableHead>
                    <TableHead className="px-5 py-3 text-xs font-bold uppercase tracking-[0.12em]">Earned</TableHead>
                    <TableHead className="px-5 py-3 text-xs font-bold uppercase tracking-[0.12em]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-5 py-4">
                        <span className="font-bold text-slate-950">{row.partnerName}</span>
                        {row.partnerCode && (
                          <span className="mt-0.5 block font-mono text-xs font-semibold text-slate-500">
                            {row.partnerCode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 font-medium text-slate-700">
                        {row.serviceName ?? "Not available"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right font-mono text-slate-600">
                        {safeCurrency(row.saleAmount)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right font-mono font-bold text-slate-950">
                        {safeCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                            STATUS_CLASS[row.status] ?? STATUS_CLASS.pending
                          }`}
                        >
                          {row.status}
                        </span>
                        {/* Surfaces the case where the status says settled but no
                            wallet credit exists, instead of hiding the mismatch. */}
                        {row.creditedToWallet ? (
                          <span className="mt-1 block text-[11px] font-semibold text-emerald-600">In wallet</span>
                        ) : (
                          (row.status === "approved" || row.status === "paid") && (
                            <span className="mt-1 block text-[11px] font-semibold text-rose-600">Not in wallet</span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 font-mono text-xs text-slate-500">
                        {safeDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <ApCommissionActions
                          commissionId={row.id}
                          status={row.status}
                          amount={row.amount}
                          partnerName={row.partnerName}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{row.partnerName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.serviceName ?? "-"}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                        STATUS_CLASS[row.status] ?? STATUS_CLASS.pending
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commission</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-slate-950">{safeCurrency(row.amount)}</p>
                    </div>
                    {row.creditedToWallet && (
                      <span className="text-[11px] font-semibold text-emerald-600">In wallet</span>
                    )}
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ApCommissionActions
                      commissionId={row.id}
                      status={row.status}
                      amount={row.amount}
                      partnerName={row.partnerName}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">
              {activeFilter === "all"
                ? "No partner commissions recorded yet."
                : `No commissions with status “${activeFilter}”.`}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
