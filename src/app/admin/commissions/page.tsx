import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminCard, PageContainer } from "@/components/admin/primitives/layout";
import { countAdminCommissions, listAdminCommissions } from "@/lib/admin/commissions-data";
import { resolvePageWindow } from "@/lib/admin/table-paging";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

import { AdminCommissionsTable } from "./commissions-table";

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "hold", label: "Hold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
] as const;

export default async function AdminCommissionsPage({
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

  // The count is resolved first so the page window is clamped against the real
  // total, not against however many rows happened to arrive. Asking for page 9
  // of 3 then lands on page 3 rather than rendering an empty table, which would
  // read as "there are no commissions".
  const total = await countAdminCommissions(activeFilter);
  const { page, from, to } = resolvePageWindow(searchPage, total, PAGE_SIZE);

  const rows = await listAdminCommissions({ from, to, status: activeFilter });

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Agent Commission Ledger"
        description="Monitor agent payouts, approved application commission overrides, and settle outstanding balances."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "all" ? "/admin/commissions" : `/admin/commissions?status=${filter.value}`
            }
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
        <AdminCommissionsTable
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
