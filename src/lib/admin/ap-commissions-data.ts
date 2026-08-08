import "server-only";

import { AP_COMMISSION_STATUSES, type ApCommissionStatus } from "@/lib/ap-commission-engine";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminApCommissionRow = {
  id: string;
  agencyPartnerId: string;
  partnerName: string;
  partnerCode: string | null;
  applicationId: string;
  serviceName: string | null;
  saleAmount: number;
  amount: number;
  status: ApCommissionStatus;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
  /** True once the amount has been credited to the partner's wallet ledger. */
  creditedToWallet: boolean;
};

export type AdminApCommissionSummary = {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidCount: number;
  paidAmount: number;
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toStatus(value: unknown): ApCommissionStatus {
  const raw = String(value ?? "pending") as ApCommissionStatus;
  return AP_COMMISSION_STATUSES.includes(raw) ? raw : "pending";
}

/**
 * Partner commissions for the admin approval screen.
 *
 * `creditedToWallet` is read from `ap_wallet_ledger` rather than inferred from
 * the status, so a commission whose status says "approved" but whose credit
 * failed is visible as such instead of silently looking settled.
 */
export async function listAdminApCommissions(input: {
  status?: string;
  limit?: number;
}): Promise<{ rows: AdminApCommissionRow[]; summary: AdminApCommissionSummary }> {
  const empty = {
    rows: [],
    summary: {
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      paidCount: 0,
      paidAmount: 0,
    },
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  const limit = Math.min(500, Math.max(1, input.limit ?? 200));

  let query = supabase
    .from("ap_commissions")
    .select(
      "id, agency_partner_id, application_id, service_name, sale_amount, calculated_amount, status, approved_at, paid_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const status = String(input.status ?? "").trim();
  if (status && status !== "all" && AP_COMMISSION_STATUSES.includes(status as ApCommissionStatus)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin-ap-commissions] list_failed", { error: error.message });
    return empty;
  }

  const commissions = (data ?? []) as Array<Record<string, unknown>>;
  if (!commissions.length) return empty;

  const partnerIds = [...new Set(commissions.map((c) => String(c.agency_partner_id)).filter(Boolean))];
  const commissionIds = commissions.map((c) => String(c.id));

  const [partnersResult, ledgerResult] = await Promise.all([
    supabase.from("agency_partners").select("id, business_name, partner_code, full_name").in("id", partnerIds),
    supabase
      .from("ap_wallet_ledger")
      .select("reference_id")
      .eq("entry_type", "commission_credit")
      .eq("reference_type", "commission")
      .in("reference_id", commissionIds),
  ]);

  if (partnersResult.error) {
    console.error("[admin-ap-commissions] partner_lookup_failed", { error: partnersResult.error.message });
  }
  if (ledgerResult.error) {
    console.error("[admin-ap-commissions] ledger_lookup_failed", { error: ledgerResult.error.message });
  }

  const partnerById = new Map(
    ((partnersResult.data ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.id), p]),
  );
  const creditedIds = new Set(
    ((ledgerResult.data ?? []) as Array<{ reference_id: string | null }>)
      .map((row) => String(row.reference_id ?? ""))
      .filter(Boolean),
  );

  const rows: AdminApCommissionRow[] = commissions.map((c) => {
    const partner = partnerById.get(String(c.agency_partner_id));
    const id = String(c.id);
    return {
      id,
      agencyPartnerId: String(c.agency_partner_id),
      partnerName: String(partner?.business_name || partner?.full_name || "Partner"),
      partnerCode: partner?.partner_code ? String(partner.partner_code) : null,
      applicationId: String(c.application_id ?? ""),
      serviceName: c.service_name ? String(c.service_name) : null,
      saleAmount: safeNumber(c.sale_amount),
      amount: safeNumber(c.calculated_amount),
      status: toStatus(c.status),
      approvedAt: c.approved_at ? String(c.approved_at) : null,
      paidAt: c.paid_at ? String(c.paid_at) : null,
      createdAt: c.created_at ? String(c.created_at) : null,
      creditedToWallet: creditedIds.has(id),
    };
  });

  const summary = rows.reduce<AdminApCommissionSummary>(
    (acc, row) => {
      if (row.status === "pending" || row.status === "earned") {
        acc.pendingCount += 1;
        acc.pendingAmount += row.amount;
      } else if (row.status === "approved") {
        acc.approvedCount += 1;
        acc.approvedAmount += row.amount;
      } else if (row.status === "paid") {
        acc.paidCount += 1;
        acc.paidAmount += row.amount;
      }
      return acc;
    },
    {
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      paidCount: 0,
      paidAmount: 0,
    },
  );

  return { rows, summary };
}
