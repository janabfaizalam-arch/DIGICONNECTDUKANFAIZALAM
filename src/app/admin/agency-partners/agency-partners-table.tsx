"use client";

/**
 * The DC Partner directory table.
 *
 * Split out of the page because `AdminColumn.cell` is a function, and a
 * function cannot cross the server/client boundary — column definitions have
 * to be declared on the client side. The page stays a server component and
 * hands this plain data.
 *
 * This replaces a hand-written desktop table plus a separately maintained
 * `lg:hidden` card grid. Both came from the same ten columns and had to be
 * edited together; the cards are now generated from the column definitions.
 */

import Link from "next/link";
import { Eye } from "lucide-react";

import { AdminDataTable, type AdminColumn } from "@/components/admin/primitives/admin-data-table";
import { NoResultsState } from "@/components/admin/primitives/states";
import { adminAgencyPartnerDetailPath } from "@/lib/admin/agency-partner-routes";
import { safeCurrency } from "@/lib/admin-format";
import { partnerTypeDisplayLabel } from "@/lib/ap/partner-type";

/**
 * Only what the table draws.
 *
 * `APListItem` carries Aadhaar, PAN and bank details; serialising it into the
 * client bundle would ship that to the browser for every partner on the page.
 * The server projects down to this first.
 */
export type PartnerTableRow = {
  id: string;
  fullName: string;
  businessName: string | null;
  mobile: string | null;
  email: string | null;
  partnerCode: string | null;
  tierName: string | null;
  partnerType: string | null;
  totalApplications: number;
  pendingApplications: number;
  status: string | null;
  kycStatus: string | null;
  pendingCommission: number;
};

function StatusPill({ value, kind }: { value: string | null; kind: "status" | "kyc" }) {
  const normalized = String(value ?? "").toLowerCase();

  const positive = kind === "status" ? normalized === "active" : normalized === "approved";
  const negative =
    kind === "status"
      ? normalized === "suspended" || normalized === "blacklisted"
      : normalized === "rejected";

  const tone = positive
    ? "bg-ds-success-soft border-ds-success-border text-ds-success"
    : negative
      ? "bg-ds-danger-soft border-ds-danger-border text-ds-danger"
      : "bg-ds-warning-soft border-ds-warning-border text-ds-warning";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${tone}`}
    >
      {value || "—"}
    </span>
  );
}

const columns: AdminColumn<PartnerTableRow>[] = [
  {
    id: "partner",
    header: "Partner details",
    priority: "primary",
    width: "10.5rem",
    sortable: true,
    exportValue: (row) => row.fullName,
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-bold text-ds-text-primary" title={row.fullName}>
          {row.fullName}
        </div>
        {row.businessName ? (
          <div className="truncate text-xs text-ds-text-muted" title={row.businessName}>
            {row.businessName}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    id: "mobile",
    header: "Mobile",
    width: "6.5rem",
    nowrap: true,
    exportValue: (row) => row.mobile,
    cell: (row) => <span className="font-mono text-xs">{row.mobile || "—"}</span>,
  },
  {
    id: "email",
    header: "Email",
    width: "8rem",
    exportValue: (row) => row.email,
    cell: (row) => (
      <span className="block truncate text-xs" title={row.email ?? undefined}>
        {row.email || "—"}
      </span>
    ),
  },
  {
    id: "code",
    header: "Partner code",
    sortable: true,
    width: "10rem",
    nowrap: true,
    exportValue: (row) => row.partnerCode,
    cell: (row) => (
      <span className="font-mono text-xs font-semibold text-ds-primary">{row.partnerCode || "—"}</span>
    ),
  },
  {
    id: "tier",
    header: "Tier & type",
    width: "7rem",
    exportValue: (row) => `${row.tierName ?? "AP Starter"} / ${partnerTypeDisplayLabel(row.partnerType)}`,
    cell: (row) => (
      <div className="text-xs font-semibold">
        <span className="text-ds-accent">{row.tierName || "AP Starter"}</span>
        <div className="text-[10px] font-normal text-ds-text-muted">
          {partnerTypeDisplayLabel(row.partnerType)}
        </div>
      </div>
    ),
  },
  {
    id: "applications",
    header: "Applications",
    sortable: true,
    width: "6rem",
    exportValue: (row) => row.totalApplications,
    cell: (row) => (
      <div className="text-xs">
        <span className="font-semibold text-ds-text-primary">{row.totalApplications}</span>
        <span className="block text-[10px] text-ds-text-muted">
          {row.pendingApplications} pending
        </span>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "5.5rem",
    exportValue: (row) => row.status,
    cell: (row) => <StatusPill value={row.status} kind="status" />,
  },
  {
    id: "kyc",
    header: "KYC",
    width: "5.5rem",
    exportValue: (row) => row.kycStatus,
    cell: (row) => <StatusPill value={row.kycStatus} kind="kyc" />,
  },
  {
    id: "settlement",
    header: "Pending settlement",
    align: "right",
    sortable: true,
    width: "6.5rem",
    nowrap: true,
    exportValue: (row) => row.pendingCommission,
    cell: (row) => <span className="font-bold">{safeCurrency(row.pendingCommission)}</span>,
  },
  {
    id: "actions",
    header: "Actions",
    align: "right",
    width: "8rem",
    nowrap: true,
    cell: (row) => (
      <Link
        href={adminAgencyPartnerDetailPath(row.id)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-ds-border bg-ds-surface px-3.5 text-xs font-bold text-ds-text-primary shadow-ds-sm hover:bg-ds-surface-sunken"
      >
        <Eye className="h-3.5 w-3.5 text-ds-primary" aria-hidden="true" />
        View/Verify
      </Link>
    ),
  },
];

export function AgencyPartnersTable({
  rows,
  total,
  page,
  pageSize,
  sortColumn,
  sortDirection,
  hasFilters,
  toolbar,
}: {
  rows: PartnerTableRow[];
  total: number;
  page: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  hasFilters: boolean;
  toolbar?: React.ReactNode;
}) {
  return (
    <AdminDataTable
      tableId="agency-partners"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      total={total}
      page={page}
      pageSize={pageSize}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      caption="DC Partner directory"
      exportFileName="digiconnect-dc-partners"
      toolbar={toolbar}
      emptyState={
        <NoResultsState
          title={hasFilters ? "No matching DC Partners" : "No DC Partners registered yet"}
          description={
            hasFilters
              ? "Try another name, mobile, email, shop name, or partner code."
              : "Use Onboard AP to register your first partner shop or referral executive."
          }
        />
      }
    />
  );
}
