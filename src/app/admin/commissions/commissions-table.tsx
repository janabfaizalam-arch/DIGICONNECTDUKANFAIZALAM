"use client";

/**
 * The agent commission ledger table.
 *
 * A client component because `AdminColumn.cell` is a function, and functions do
 * not cross the server boundary; the page stays a server component.
 *
 * Replaces a hand-written desktop table plus a separate `lg:hidden` card grid
 * built from the same six columns. The two had drifted — the card layout
 * dropped the earned date entirely, and fell back to showing a raw `agent_id`
 * where the table showed an email. The cards are now generated from these
 * column definitions, so there is nothing left to keep in step by hand.
 */

import { AdminDataTable, type AdminColumn } from "@/components/admin/primitives/admin-data-table";
import { NoResultsState } from "@/components/admin/primitives/states";
import { CommissionActions } from "@/components/portal/commission-actions";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import type { AdminCommissionRow } from "@/lib/admin/commissions-data";

/**
 * Commission state to meaning.
 *
 * Was a two-way `paid ? emerald : amber`, which painted `cancelled` and
 * `rejected` the same amber as `pending` — a settled-and-void commission read
 * as merely waiting. Each state now carries its own meaning, on tokens.
 */
const STATUS_TONE: Record<string, string> = {
  pending: "bg-ds-warning-soft text-ds-warning border-ds-warning-border",
  hold: "bg-ds-warning-soft text-ds-warning border-ds-warning-border",
  approved: "bg-ds-success-soft text-ds-success border-ds-success-border",
  // Approved money sits in the wallet; paid money has left. Different events,
  // so they do not share a colour.
  paid: "bg-ds-info-soft text-ds-info border-ds-info-border",
  cancelled: "bg-ds-surface-sunken text-ds-text-muted border-ds-border",
  rejected: "bg-ds-danger-soft text-ds-danger border-ds-danger-border",
};

const columns: AdminColumn<AdminCommissionRow>[] = [
  {
    id: "agent",
    header: "Agent",
    priority: "primary",
    width: "12rem",
    exportValue: (row) => row.agentName,
    cell: (row) => (
      <div className="min-w-0">
        <span className="block truncate font-bold text-ds-text-primary" title={row.agentName}>
          {row.agentName}
        </span>
        {row.agentEmail ? (
          <span
            className="mt-0.5 block truncate font-mono text-xs font-semibold text-ds-text-muted"
            title={row.agentEmail}
          >
            {row.agentEmail}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: "service",
    header: "Service",
    hideBelow: 620,
    width: "10rem",
    exportValue: (row) => row.serviceName ?? "",
    cell: (row) => (
      <span
        className="block truncate font-medium text-ds-text-secondary"
        title={row.serviceName ?? undefined}
      >
        {row.serviceName ?? "Not available"}
      </span>
    ),
  },
  {
    id: "amount",
    header: "Commission",
    align: "right",
    width: "8rem",
    nowrap: true,
    exportValue: (row) => row.amount,
    cell: (row) => (
      <span className="font-mono font-bold text-ds-text-primary">{safeCurrency(row.amount)}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "7rem",
    exportValue: (row) => row.status,
    cell: (row) => (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
          STATUS_TONE[row.status] ?? STATUS_TONE.pending
        }`}
      >
        {row.status}
      </span>
    ),
  },
  {
    id: "earned",
    header: "Earned",
    hideBelow: 740,
    width: "7rem",
    nowrap: true,
    exportValue: (row) => row.createdAt,
    cell: (row) => (
      <span className="font-mono text-xs text-ds-text-muted">{safeDate(row.createdAt)}</span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    sticky: true,
    width: "9.5rem",
    nowrap: true,
    cell: (row) => <CommissionActions commissionId={row.id} />,
  },
];

export function AdminCommissionsTable({
  rows,
  total,
  page,
  pageSize,
  activeFilter,
  toolbar,
}: {
  rows: AdminCommissionRow[];
  total: number;
  page: number;
  pageSize: number;
  activeFilter: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <AdminDataTable
      tableId="admin-commissions"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      total={total}
      page={page}
      pageSize={pageSize}
      caption="Agent commission ledger"
      exportFileName="digiconnect-agent-commissions"
      toolbar={toolbar}
      emptyState={
        <NoResultsState
          title={activeFilter === "all" ? "No commissions recorded" : "No matching commissions"}
          description={
            activeFilter === "all"
              ? "Agent commissions appear here once applications are completed."
              : `No commissions with status “${activeFilter}”.`
          }
        />
      }
    />
  );
}
