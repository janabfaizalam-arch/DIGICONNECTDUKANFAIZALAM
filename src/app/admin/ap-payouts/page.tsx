import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { ApPayoutActions } from "@/components/admin/ap-payout-actions";
import { Card } from "@/components/ui/card";
import { listPayoutsForAdmin } from "@/lib/ap-payouts";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "requested", label: "Awaiting action" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

const STATUS_CLASS: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700 border-amber-100",
  processing: "bg-blue-50 text-blue-700 border-blue-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

function bankLine(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const upi = String(snapshot.upi_id ?? "").trim();
  if (upi) return `UPI · ${upi}`;

  const account = String(snapshot.bank_account_number ?? "").trim();
  const ifsc = String(snapshot.bank_ifsc ?? "").trim();
  if (!account) return null;
  // Only the tail of the account number — the full number does not need to be
  // on screen to identify the transfer.
  return `${String(snapshot.bank_name ?? "Bank")} ··${account.slice(-4)}${ifsc ? ` · ${ifsc}` : ""}`;
}

export default async function AdminApPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { status } = await searchParams;
  const active = status && FILTERS.some((f) => f.value === status) ? status : "requested";

  const { rows, summary } = await listPayoutsForAdmin(active);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Partner Payouts"
        description="A partner's wallet is debited the moment they request a payout, and they cannot request another until this one is resolved. Mark it paid once the transfer is out, or reject it to return the money to their wallet."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Awaiting action", value: safeCurrency(summary.requestedAmount), sub: `${summary.requested} request${summary.requested === 1 ? "" : "s"}`, tone: "text-amber-700" },
          { label: "Processing", value: String(summary.processing), sub: "in progress", tone: "text-blue-700" },
          { label: "Paid out", value: safeCurrency(summary.paidAmount), sub: "all time", tone: "text-emerald-700" },
        ].map((tile) => (
          <Card key={tile.label} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{tile.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${tile.tone}`}>{tile.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{tile.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/ap-payouts?status=${filter.value}`}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition ${
              active === filter.value
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
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-950">{row.partnerName}</p>
                    {row.partnerCode ? (
                      <span className="font-mono text-xs font-semibold text-slate-500">{row.partnerCode}</span>
                    ) : null}
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                        STATUS_CLASS[row.status] ?? STATUS_CLASS.requested
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Requested {safeDate(row.requestedAt)}
                    {bankLine(row.bankSnapshot) ? ` · ${bankLine(row.bankSnapshot)}` : ""}
                    {row.paymentReference ? ` · Ref ${row.paymentReference}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <p className="font-mono text-lg font-bold text-slate-950">{safeCurrency(row.amount)}</p>
                  <ApPayoutActions payoutId={row.id} status={row.status} amount={row.amount} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">
              {active === "requested" ? "No payout requests waiting." : `No ${active} payouts.`}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
