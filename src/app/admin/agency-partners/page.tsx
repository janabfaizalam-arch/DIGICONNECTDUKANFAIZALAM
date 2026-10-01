import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, FileSpreadsheet, UserPlus } from "lucide-react";

import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";
import {
  ADMIN_AGENCY_PARTNERS_NEW_ROUTE,
  adminAgencyPartnerExportPath,
} from "@/lib/admin/agency-partner-routes";
import {
  filterAgencyPartners,
  parseAgencyPartnerFilters,
} from "@/lib/admin/agency-partner-filters";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminCard } from "@/components/admin/primitives/layout";
import { resolvePageWindow } from "@/lib/admin/table-paging";
import { safeCurrency } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminAgencyPartnerList } from "@/lib/ap-data";
import { AP_PARTNER_TYPE_LABELS, type APListItem } from "@/lib/ap-types";
import { DIGI_PARTNER_TYPE_VALUES } from "@/lib/ap/partner-type";

import {
  AgencyPartnersTable,
  type PartnerTableRow,
} from "./agency-partners-table";
import { PartnerFilters } from "./partner-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type AdminAPPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

/**
 * Project a partner down to what the table draws.
 *
 * `APListItem` carries Aadhaar, PAN, bank account and IFSC. Handing the whole
 * record to a client component would serialise all of that into the page's
 * RSC payload — readable in the browser — for every partner on screen. The
 * table only ever renders these twelve fields, so only these cross.
 */
function toTableRow(partner: APListItem): PartnerTableRow {
  return {
    id: String(partner.id),
    fullName: partner.full_name,
    businessName: partner.business_name,
    mobile: partner.mobile,
    email: partner.email,
    partnerCode: partner.partner_code,
    tierName: partner.tier?.name ?? null,
    partnerType: partner.partner_type,
    totalApplications: partner.totalApplications,
    pendingApplications: partner.pendingApplications,
    status: partner.status,
    kycStatus: partner.kyc_status,
    pendingCommission: partner.pendingCommission,
  };
}

/** Sort keys the table offers, mapped to how each one actually compares. */
const SORTERS: Record<string, (a: APListItem, b: APListItem) => number> = {
  partner: (a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""),
  code: (a, b) => (a.partner_code ?? "").localeCompare(b.partner_code ?? ""),
  applications: (a, b) => a.totalApplications - b.totalApplications,
  settlement: (a, b) => a.pendingCommission - b.pendingCommission,
};

export default async function AdminAgencyPartnersPage({ searchParams }: AdminAPPageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseAgencyPartnerFilters({ q: params?.q, type: params?.type });
  const { query, type: typeFilter } = filters;

  const partners = await getAdminAgencyPartnerList();
  const matching = filterAgencyPartners(partners, filters);

  /*
    Sorting and paging happen here rather than in the browser so the client
    receives one page, not the directory. They are still in application code
    rather than SQL: the partner rollups this sorts on are computed in
    `getAdminAgencyPartnerList`, so sorting by them in the database needs the
    aggregation moved into a view or RPC — a migration, deliberately out of
    Phase A's scope. At this table's size the distinction is not observable;
    it is recorded so the next phase knows where to pick it up.
  */
  const sortColumn = String(params?.sort ?? "").trim() || null;
  const sortDirection = params?.dir === "desc" ? "desc" : "asc";
  const sorter = sortColumn ? SORTERS[sortColumn] : undefined;

  const ordered = sorter
    ? [...matching].sort((a, b) => (sortDirection === "desc" ? -sorter(a, b) : sorter(a, b)))
    : matching;

  const total = ordered.length;
  const { page, from, to } = resolvePageWindow(params?.page, total, PAGE_SIZE);
  const rows = ordered.slice(from, to).map(toTableRow);

  const exportHref = adminAgencyPartnerExportPath({ q: query, type: typeFilter });
  const totalCommissions = partners.reduce(
    (sum, ap) => sum + ap.pendingCommission + ap.totalPaidCommission,
    0,
  );
  const pendingCommissions = partners.reduce((sum, ap) => sum + ap.pendingCommission, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="DC Partners"
        title="AP Ecosystem Console"
        description="Verify KYC uploads, configure partner tiers, manage hierarchical commissions, and audit financial wallets."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={DIGI_PARTNER_LOGIN_ROUTE}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the DC Partner sign-in portal in a new tab"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ds-border bg-ds-surface px-4 text-sm font-bold text-ds-text-secondary shadow-ds-sm transition hover:bg-ds-surface-sunken"
            >
              <ExternalLink className="h-4 w-4 text-ds-primary" />
              Open Partner Portal
            </a>
            <a
              href={exportHref}
              title={`Download full details for ${total} DC Partner${total === 1 ? "" : "s"} as an Excel workbook`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ds-success-border bg-ds-success-soft px-4 text-sm font-bold text-ds-success shadow-ds-sm transition hover:brightness-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </a>
            <Link
              href={ADMIN_AGENCY_PARTNERS_NEW_ROUTE}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ds-primary px-4 text-sm font-bold text-ds-text-inverted transition hover:bg-ds-primary-hover"
            >
              <UserPlus className="h-4 w-4" />
              Onboard AP
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatCard title="Total Partners" value={partners.length} icon="userCheck" tone="blue" />
        <AdminStatCard
          title="Active Partners"
          value={partners.filter((ap) => ap.status === "active").length}
          icon="users"
          tone="green"
        />
        <AdminStatCard title="Total Earned" value={safeCurrency(totalCommissions)} icon="indianRupee" tone="orange" />
        <AdminStatCard
          title="Awaiting Settlement"
          value={safeCurrency(pendingCommissions)}
          icon="indianRupee"
          tone="slate"
        />
      </div>

      <AdminCard padded={false} className="p-4 md:p-5">
        <AgencyPartnersTable
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          hasFilters={Boolean(query || typeFilter)}
          toolbar={
            <PartnerFilters
              partnerTypes={DIGI_PARTNER_TYPE_VALUES.map((value) => ({
                value,
                label: AP_PARTNER_TYPE_LABELS[value],
              }))}
            />
          }
        />
      </AdminCard>
    </div>
  );
}
