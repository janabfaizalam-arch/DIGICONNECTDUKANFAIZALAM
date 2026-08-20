import "server-only";

import {
  PARTNER_APPLICATION_STATUSES,
  type PartnerApplicationStatus,
} from "@/lib/partner-applications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminPartnerApplicationRow = {
  id: string;
  fullName: string;
  businessName: string | null;
  partnerType: string;
  mobile: string;
  whatsapp: string | null;
  email: string;
  location: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  gstin: string | null;
  referralSource: string | null;
  about: string | null;
  status: PartnerApplicationStatus;
  trackingCode: string;
  partnerCode: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type AdminPartnerApplicationSummary = {
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
};

const EMPTY = {
  rows: [] as AdminPartnerApplicationRow[],
  summary: { pending: 0, underReview: 0, approved: 0, rejected: 0 },
};

function locationOf(row: Record<string, unknown>): string | null {
  const parts = [row.district, row.state, row.pin]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/**
 * Digi Partner signup applications for the admin review queue.
 *
 * Newest first within the whole list; the screen's default filter is the
 * open ones, because an application nobody looks at is a person who applied
 * and never heard back.
 */
export async function listPartnerApplications(input: {
  status?: string;
  limit?: number;
}): Promise<{ rows: AdminPartnerApplicationRow[]; summary: AdminPartnerApplicationSummary }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return EMPTY;

  const limit = Math.min(500, Math.max(1, input.limit ?? 200));

  let query = supabase
    .from("agency_partner_applications")
    .select(
      "id, full_name, business_name, partner_type, mobile, whatsapp, email, address, state, district, pin, pan_number, aadhaar_number, gstin, referral_source, about, status, tracking_code, partner_code, review_notes, created_at, reviewed_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const status = String(input.status ?? "").trim();
  if (status && status !== "all" && (PARTNER_APPLICATION_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  } else if (status === "open") {
    query = query.in("status", ["pending", "under_review"]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin-partner-applications] list_failed", { error: error.message });
    return EMPTY;
  }

  const rows: AdminPartnerApplicationRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    businessName: row.business_name ? String(row.business_name) : null,
    partnerType: String(row.partner_type ?? "business_partner"),
    mobile: String(row.mobile ?? ""),
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    email: String(row.email ?? ""),
    location: locationOf(row),
    panNumber: row.pan_number ? String(row.pan_number) : null,
    aadhaarNumber: row.aadhaar_number ? String(row.aadhaar_number) : null,
    gstin: row.gstin ? String(row.gstin) : null,
    referralSource: row.referral_source ? String(row.referral_source) : null,
    about: row.about ? String(row.about) : null,
    status: String(row.status ?? "pending") as PartnerApplicationStatus,
    trackingCode: String(row.tracking_code ?? ""),
    partnerCode: row.partner_code ? String(row.partner_code) : null,
    reviewNotes: row.review_notes ? String(row.review_notes) : null,
    submittedAt: row.created_at ? String(row.created_at) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  }));

  // Counts describe the whole queue, not the filtered page, so the tiles do
  // not read as zero just because a filter is applied.
  const { data: allStatuses } = await supabase
    .from("agency_partner_applications")
    .select("status")
    .limit(5000);

  const summary = ((allStatuses ?? []) as Array<{ status: string }>).reduce<AdminPartnerApplicationSummary>(
    (acc, row) => {
      if (row.status === "pending") acc.pending += 1;
      else if (row.status === "under_review") acc.underReview += 1;
      else if (row.status === "approved") acc.approved += 1;
      else if (row.status === "rejected") acc.rejected += 1;
      return acc;
    },
    { pending: 0, underReview: 0, approved: 0, rejected: 0 },
  );

  return { rows, summary };
}
