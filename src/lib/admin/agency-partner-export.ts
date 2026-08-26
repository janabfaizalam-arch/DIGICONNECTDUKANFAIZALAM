/**
 * Digi Partner (Agency Partner) Excel export.
 *
 * Turns the admin console's partner list into a full-detail .xlsx: identity,
 * contact, address, KYC identifiers, banking, tier & commission config,
 * hierarchy, application counts, settlement figures and lifecycle timestamps —
 * one partner per row.
 *
 * Admin-only data. The route that serves this checks `isAdminRole` first.
 */

import { buildXlsx, type XlsxCell, type XlsxColumn } from "@/lib/export/xlsx";
import {
  AP_KYC_STATUS_LABELS,
  AP_STATUS_LABELS,
  type APKycStatus,
  type APListItem,
  type APStatus,
} from "@/lib/ap-types";
import { partnerTypeDisplayLabel } from "@/lib/ap/partner-type";

export const AGENCY_PARTNER_EXPORT_SHEET_NAME = "Digi Partners";

type ExportColumn = XlsxColumn & {
  value: (ap: APListItem) => XlsxCell;
};

// ── Cell formatters ────────────────────────────────────────────────────────

/** Excel shows an empty cell rather than a dash, so filters and counts stay clean. */
function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  const trimmed = String(value).trim();
  return trimmed;
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

/** ISO date (yyyy-mm-dd) sorts correctly in every spreadsheet locale. */
function isoDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function isoDateTime(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().replace("T", " ").slice(0, 16);
}

function statusLabel(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  return AP_STATUS_LABELS[raw as APStatus] ?? raw.replace(/_/g, " ");
}

function kycStatusLabel(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  return AP_KYC_STATUS_LABELS[raw as APKycStatus] ?? raw.replace(/_/g, " ");
}

/** Partner type without the emoji prefix the UI badge uses. */
function partnerTypeLabel(value: unknown): string {
  return partnerTypeDisplayLabel(text(value) || null)
    .replace(/^[^\p{L}]+/u, "")
    .trim();
}

// ── Column definitions ─────────────────────────────────────────────────────

export const AGENCY_PARTNER_EXPORT_COLUMNS: ExportColumn[] = [
  // Identity
  { header: "Partner Code", width: 22, value: (ap) => text(ap.partner_code) },
  { header: "Full Name", width: 26, value: (ap) => text(ap.full_name) },
  { header: "Business / Shop Name", width: 26, value: (ap) => text(ap.business_name) },
  { header: "Partner Type", width: 18, value: (ap) => partnerTypeLabel(ap.partner_type) },
  { header: "Tier", width: 16, value: (ap) => text(ap.tier?.name) },
  { header: "Status", width: 14, value: (ap) => statusLabel(ap.status) },

  // Contact
  { header: "Mobile", width: 14, value: (ap) => text(ap.mobile) },
  { header: "WhatsApp", width: 14, value: (ap) => text(ap.whatsapp) },
  { header: "Email", width: 30, value: (ap) => text(ap.email) },
  { header: "Emergency Contact", width: 18, value: (ap) => text(ap.emergency_contact) },

  // Address
  { header: "Address", width: 36, value: (ap) => text(ap.address) },
  { header: "District", width: 18, value: (ap) => text(ap.district) },
  { header: "State", width: 18, value: (ap) => text(ap.state) },
  { header: "PIN Code", width: 12, value: (ap) => text(ap.pin) },
  { header: "Territory", width: 18, value: (ap) => text(ap.territory) },

  // KYC
  { header: "KYC Status", width: 16, value: (ap) => kycStatusLabel(ap.kyc_status) },
  { header: "KYC Verified On", width: 18, value: (ap) => isoDateTime(ap.kyc_verified_at) },
  { header: "Aadhaar Number", width: 20, value: (ap) => text(ap.aadhaar_number) },
  { header: "PAN Number", width: 16, value: (ap) => text(ap.pan_number) },
  { header: "GSTIN", width: 20, value: (ap) => text(ap.gstin) },

  // Banking
  { header: "Bank Account Name", width: 26, value: (ap) => text(ap.bank_account_name) },
  { header: "Bank Account Number", width: 22, value: (ap) => text(ap.bank_account_number) },
  { header: "Bank IFSC", width: 16, value: (ap) => text(ap.bank_ifsc) },
  { header: "Bank Name", width: 24, value: (ap) => text(ap.bank_name) },
  { header: "UPI ID", width: 24, value: (ap) => text(ap.upi_id) },

  // Commission configuration
  { header: "Commission Plan", width: 20, value: (ap) => text(ap.commission_plan) },
  { header: "Commission Type", width: 18, value: (ap) => text(ap.commission_type) },
  { header: "Commission Value", width: 18, value: (ap) => amount(ap.commission_value) },
  { header: "Commission Rate (%)", width: 20, value: (ap) => amount(ap.commission_rate) },

  // Performance
  { header: "Total Applications", width: 18, value: (ap) => amount(ap.totalApplications) },
  { header: "Pending Applications", width: 20, value: (ap) => amount(ap.pendingApplications) },
  { header: "Completed Applications", width: 22, value: (ap) => amount(ap.completedApplications) },
  { header: "Pending Settlement (Rs)", width: 22, value: (ap) => amount(ap.pendingCommission) },
  { header: "Paid Commission (Rs)", width: 22, value: (ap) => amount(ap.totalPaidCommission) },
  {
    header: "Lifetime Commission (Rs)",
    width: 24,
    value: (ap) => amount(ap.pendingCommission) + amount(ap.totalPaidCommission),
  },

  // Team / profile
  { header: "Department", width: 18, value: (ap) => text(ap.department) },
  { header: "Joining Date", width: 14, value: (ap) => isoDate(ap.joining_date) },
  { header: "Nominee Name", width: 22, value: (ap) => text(ap.nominee_name) },
  { header: "Nominee Relation", width: 18, value: (ap) => text(ap.nominee_relation) },
  { header: "Referral Source", width: 20, value: (ap) => text(ap.referral_source) },

  // Lifecycle
  { header: "Registered On", width: 18, value: (ap) => isoDateTime(ap.created_at) },
  { header: "Activated On", width: 18, value: (ap) => isoDateTime(ap.activated_at) },
  { header: "Suspended On", width: 18, value: (ap) => isoDateTime(ap.suspended_at) },
  { header: "Blacklisted On", width: 18, value: (ap) => isoDateTime(ap.blacklisted_at) },
  { header: "Last Updated", width: 18, value: (ap) => isoDateTime(ap.updated_at) },
  { header: "Admin Notes", width: 40, value: (ap) => text(ap.admin_notes) },

  // Identifiers last — useful for support, noise for everyday reading.
  { header: "Partner ID", width: 38, value: (ap) => text(ap.id) },
  { header: "User ID", width: 38, value: (ap) => text(ap.user_id) },
];

export const AGENCY_PARTNER_EXPORT_HEADERS = AGENCY_PARTNER_EXPORT_COLUMNS.map(
  (column) => column.header,
);

export function buildAgencyPartnerExportRow(ap: APListItem): XlsxCell[] {
  return AGENCY_PARTNER_EXPORT_COLUMNS.map((column) => column.value(ap));
}

/** Serialize the partner list into a downloadable .xlsx buffer. */
export function buildAgencyPartnerWorkbook(partners: APListItem[]): Buffer {
  return buildXlsx([
    {
      name: AGENCY_PARTNER_EXPORT_SHEET_NAME,
      columns: AGENCY_PARTNER_EXPORT_COLUMNS.map(({ header, width }) => ({ header, width })),
      rows: partners.map(buildAgencyPartnerExportRow),
    },
  ]);
}

/** e.g. digiconnect-digi-partners-2026-08-26.xlsx */
export function agencyPartnerExportFileName(now: Date = new Date()): string {
  return `digiconnect-digi-partners-${now.toISOString().slice(0, 10)}.xlsx`;
}
