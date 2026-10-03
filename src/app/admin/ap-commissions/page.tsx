import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminCard, PageContainer } from "@/components/admin/primitives/layout";
import { resolvePageWindow } from "@/lib/admin/table-paging";
import { listAdminApCommissions } from "@/lib/admin/ap-commissions-data";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

import { ApCommissionsTable } from "./ap-commissions-table";

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "reversed", label: "Reversed" },
] as const;


export default async function AdminApCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const { status, page: searchPage } = await searchParams;
  const activeFilter = status && FILTERS.some((f) => f.value === status) ? status : "all";

  const { rows: allRows, summary } = await listAdminApCommissions({ status: activeFilter });

  // The data layer returns the whole filtered set; the table renders a page of
  // it. Pushing the window into listAdminApCommissions is a data-layer change
  // and is left for the batch that migrates the rest of these tables.
  const total = allRows.length;
  const { page, from, to } = resolvePageWindow(searchPage, total, PAGE_SIZE);
  const rows = allRows.slice(from, to);

  const tiles = [
    { label: "Awaiting approval", count: summary.pendingCount, amount: summary.pendingAmount, tone: "text-ds-warning" },
    { label: "Approved — in wallet", count: summary.approvedCount, amount: summary.approvedAmount, tone: "text-ds-success" },
    { label: "Paid out", count: summary.paidCount, amount: summary.paidAmount, tone: "text-ds-info" },
  ];

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Partner Commissions"
        description="Approve partner commissions to credit their DigiWallet. Approving moves the money into the partner's balance so they can request a payout; cancelling or reversing takes it back out."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <AdminCard key={tile.label}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ds-text-muted">{tile.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${tile.tone}`}>{safeCurrency(tile.amount)}</p>
            <p className="mt-0.5 text-xs font-semibold text-ds-text-muted">
              {tile.count} commission{tile.count === 1 ? "" : "s"}
            </p>
          </AdminCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "all" ? "/admin/ap-commissions" : `/admin/ap-commissions?status=${filter.value}`}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold transition ${
              activeFilter === filter.value
                ? "border-ds-primary bg-ds-primary text-ds-text-inverted"
                : "border-ds-border bg-ds-surface text-ds-text-secondary hover:bg-ds-surface-sunken"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <AdminCard padded={false} className="p-4">
        <ApCommissionsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          activeFilter={activeFilter}
        />
      </AdminCard>
    </PageContainer>
  );
}
