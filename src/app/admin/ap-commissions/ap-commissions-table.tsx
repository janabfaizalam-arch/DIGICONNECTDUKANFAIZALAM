"use client";

/**
 * The partner commissions table.
 *
 * A client component because `AdminColumn.cell` is a function and functions do
 * not cross the server boundary; the page stays a server component.
 *
 * Replaces a hand-written desktop table plus a separate `lg:hidden` card grid
 * that rendered the same seven columns a second time — the two had to be kept
 * in step by hand, and the mobile one had already drifted (it dropped the sale
 * amount and the earned date, and showed "In wallet" but never the "Not in
 * wallet" warning that the desktop table raised).
 */

import { AdminDataTable, type AdminColumn } from "@/components/admin/primitives/admin-data-table";
import { NoResultsState } from "@/components/admin/primitives/states";
import { ApCommissionActions } from "@/components/admin/ap-commission-actions";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import type { AdminApCommissionRow } from "@/lib/admin/ap-commissions-data";

/**
 * Commission state to meaning.
 *
 * Was a STATUS_CLASS map of literal Tailwind colours. `paid` reads as info
 * rather than success on purpose: approved money is already in the partner's
 * wallet, paid money has left — they are different events and the panel
 * should not show both in green.
 */
const STATUS_TONE: Record<string, string> = {
  pending: "bg-ds-warning-soft text-ds-warning border-ds-warning-border",
  earned: "bg-ds-warning-soft text-ds-warning border-ds-warning-border",
  approved: "bg-ds-success-soft text-ds-success border-ds-success-border",
  paid: "bg-ds-info-soft text-ds-info border-ds-info-border",
  cancelled: "bg-ds-surface-sunken text-ds-text-muted border-ds-border",
  reversed: "bg-ds-danger-soft text-ds-danger border-ds-danger-border",
  adjusted: "bg-ds-surface-sunken text-ds-text-muted border-ds-border",
};

const columns: AdminColumn<AdminApCommissionRow>[] = [
  {
    id: "partner",
    header: "Partner",
    priority: "primary",
    exportValue: (row) => row.partnerName,
    cell: (row) => (
      <div className="min-w-0">
        <span className="font-bold text-ds-text-primary">{row.partnerName}</span>
        {row.partnerCode ? (
          <span className="mt-0.5 block font-mono text-xs font-semibold text-ds-text-muted">
            {row.partnerCode}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: "service",
    header: "Service",
    exportValue: (row) => row.serviceName ?? "",
    cell: (row) => (
      <span className="font-medium text-ds-text-secondary">{row.serviceName ?? "Not available"}</span>
    ),
  },
  {
    id: "sale",
    header: "Sale",
    align: "right",
    exportValue: (row) => row.saleAmount,
    cell: (row) => <span className="font-mono text-ds-text-secondary">{safeCurrency(row.saleAmount)}</span>,
  },
  {
    id: "amount",
    header: "Commission",
    align: "right",
    exportValue: (row) => row.amount,
    cell: (row) => (
      <span className="font-mono font-bold text-ds-text-primary">{safeCurrency(row.amount)}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    exportValue: (row) => row.status,
    cell: (row) => (
      <div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
            STATUS_TONE[row.status] ?? STATUS_TONE.pending
          }`}
        >
          {row.status}
        </span>
        {/* Surfaces the case where the status says settled but no wallet
            credit exists, instead of hiding the mismatch. */}
        {row.creditedToWallet ? (
          <span className="mt-1 block text-[11px] font-semibold text-ds-success">In wallet</span>
        ) : (
          (row.status === "approved" || row.status === "paid") && (
            <span className="mt-1 block text-[11px] font-semibold text-ds-danger">Not in wallet</span>
          )
        )}
      </div>
    ),
  },
  {
    id: "earned",
    header: "Earned",
    exportValue: (row) => row.createdAt,
    cell: (row) => <span className="font-mono text-xs text-ds-text-muted">{safeDate(row.createdAt)}</span>,
  },
  {
    id: "actions",
    header: "Actions",
    cell: (row) => (
      <ApCommissionActions
        commissionId={row.id}
        status={row.status}
        amount={row.amount}
        partnerName={row.partnerName}
      />
    ),
  },
];

export function ApCommissionsTable({
  rows,
  total,
  page,
  pageSize,
  activeFilter,
}: {
  rows: AdminApCommissionRow[];
  total: number;
  page: number;
  pageSize: number;
  activeFilter: string;
}) {
  return (
    <AdminDataTable
      tableId="ap-commissions"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      total={total}
      page={page}
      pageSize={pageSize}
      caption="Partner commissions"
      exportFileName="digiconnect-partner-commissions"
      emptyState={
        <NoResultsState
          title="No commissions"
          description={
            activeFilter === "all"
              ? "No partner commissions recorded yet."
              : `No commissions with status “${activeFilter}”.`
          }
        />
      }
    />
  );
}
