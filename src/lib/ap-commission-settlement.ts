/**
 * Pay a partner the moment their application completes.
 *
 * The partner is shown a payout on every service card before they sell it
 * ("+₹50 earn"), and that promise is snapshotted onto the application as
 * `agent_payout_snapshot` when they create it. Settlement honours that
 * snapshot first, so what a partner was shown is what they are paid, even if
 * the service's payout is edited afterwards.
 *
 * This module exists because completion used to credit the wallet inline in
 * the AP transition route, writing the ledger entry against the
 * `commission_transactions` id while `creditCommission` and
 * `reverseCommissionCredit` both look the entry up by the `ap_commissions` id.
 * The two never matched: an admin approving the same commission afterwards
 * paid the partner a second time, and cancelling it clawed nothing back.
 * Routing every credit through `creditCommission` keyed on the commission id
 * makes paying twice impossible.
 */

import { calculateCommission, logCommissionStatusChange } from "@/lib/ap-commission-engine";
import { payoutForAgentService } from "@/lib/agent-services";
import { creditCommission } from "@/lib/ap-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CommissionSource = "application_snapshot" | "service_payout" | "commission_rule" | "none";

export type ResolvedCommission = {
  amount: number;
  source: CommissionSource;
  ruleId: string | null;
  commissionType: string;
  commissionRate: number;
  ruleSnapshot: Record<string, unknown> | null;
};

export type SettlementResult =
  | {
      ok: true;
      /** False when there was nothing to settle (no partner, or the payout is zero). */
      settled: boolean;
      amount: number;
      source: CommissionSource;
      commissionId?: string;
      /** False when the wallet already held this credit — a repeat completion. */
      walletChanged: boolean;
    }
  | { ok: false; error: string };

type ApplicationRow = {
  id: string;
  agency_partner_id: string | null;
  service_id: string | null;
  agent_service_id: string | null;
  service_slug: string | null;
  service_name: string | null;
  amount: number | null;
  agent_payout_snapshot: number | null;
};

const APPLICATION_COLUMNS =
  "id, agency_partner_id, service_id, agent_service_id, service_slug, service_name, amount, agent_payout_snapshot";

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * What this application should pay its partner.
 *
 * Order matters and is not arbitrary:
 *   1. `agent_payout_snapshot` — the figure the partner saw when they sold it.
 *   2. The service's live payout — for applications created before snapshots
 *      existed, or opened from the admin side where no snapshot was taken.
 *   3. `commission_rules` — the safety net, including the global fallback, so a
 *      service with no payout configured still pays something rather than
 *      silently paying nothing.
 */
export async function resolveCommissionAmount(application: {
  agencyPartnerId: string;
  serviceId: string | null;
  agentServiceId: string | null;
  serviceSlug: string | null;
  saleAmount: number;
  payoutSnapshot: number | null;
  tierId?: string | null;
}): Promise<ResolvedCommission> {
  const snapshot = safeNumber(application.payoutSnapshot);
  if (snapshot > 0) {
    return {
      amount: snapshot,
      source: "application_snapshot",
      ruleId: null,
      commissionType: "fixed",
      commissionRate: 0,
      ruleSnapshot: { agent_payout_snapshot: snapshot },
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { amount: 0, source: "none", ruleId: null, commissionType: "fixed", commissionRate: 0, ruleSnapshot: null };
  }

  // The service card the partner browses is an `agent_services` row, so its
  // payout config is the same one that rendered the "+₹50 earn" badge.
  const serviceQuery = supabase
    .from("agent_services")
    .select("id, customer_fee, agent_payout, payout_type, payout_percentage")
    .limit(1);

  const { data: serviceRows } = application.agentServiceId
    ? await serviceQuery.eq("id", application.agentServiceId)
    : application.serviceSlug
      ? await serviceQuery.eq("slug", application.serviceSlug)
      : { data: null };

  const service = (serviceRows ?? [])[0] as Record<string, unknown> | undefined;

  if (service) {
    const payout = payoutForAgentService({
      customer_fee: safeNumber(service.customer_fee, application.saleAmount),
      agent_payout: safeNumber(service.agent_payout),
      payout_type: service.payout_type === "percentage" ? "percentage" : "fixed",
      payout_percentage: safeNumber(service.payout_percentage),
    });

    if (payout > 0) {
      return {
        amount: payout,
        source: "service_payout",
        ruleId: null,
        commissionType: service.payout_type === "percentage" ? "percentage" : "fixed",
        commissionRate: service.payout_type === "percentage" ? safeNumber(service.payout_percentage) : 0,
        ruleSnapshot: service as Record<string, unknown>,
      };
    }
  }

  const calc = await calculateCommission({
    agencyPartnerId: application.agencyPartnerId,
    tierId: application.tierId ?? null,
    serviceId: application.serviceId,
    saleAmount: application.saleAmount,
  });

  if (calc.amount > 0) {
    return {
      amount: calc.amount,
      source: "commission_rule",
      ruleId: calc.ruleUsed?.id ?? null,
      commissionType: calc.commissionType,
      commissionRate: calc.commissionRate,
      ruleSnapshot: calc.ruleSnapshot,
    };
  }

  return { amount: 0, source: "none", ruleId: null, commissionType: "fixed", commissionRate: 0, ruleSnapshot: null };
}

/**
 * Record and pay the commission for a completed application.
 *
 * Safe to call more than once for the same application, and safe to call from
 * any route that can complete one: the `ap_commissions` row is reused if it
 * already exists and `creditCommission` refuses to credit the same commission
 * twice. Completion is the only thing a caller needs to be sure of.
 */
export async function settleCommissionForCompletedApplication(params: {
  applicationId: string;
  actorId: string | null;
  /** Skips a lookup when the caller already loaded the row. */
  application?: Partial<ApplicationRow>;
}): Promise<SettlementResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Missing server config" };

  let application = params.application as ApplicationRow | undefined;

  if (!application?.agency_partner_id) {
    const { data, error } = await supabase
      .from("applications")
      .select(APPLICATION_COLUMNS)
      .eq("id", params.applicationId)
      .maybeSingle();

    if (error) {
      console.error("[ap-settlement] application_load_failed", {
        applicationId: params.applicationId,
        error: error.message,
      });
      return { ok: false, error: "Could not load the application." };
    }
    application = (data ?? undefined) as ApplicationRow | undefined;
  }

  // Not a partner sale — nothing is owed to anyone.
  if (!application?.agency_partner_id) {
    return { ok: true, settled: false, amount: 0, source: "none", walletChanged: false };
  }

  const partnerId = String(application.agency_partner_id);

  const { data: partner } = await supabase
    .from("agency_partners")
    .select("tier_id")
    .eq("id", partnerId)
    .maybeSingle();

  const resolved = await resolveCommissionAmount({
    agencyPartnerId: partnerId,
    serviceId: application.service_id ?? null,
    agentServiceId: application.agent_service_id ?? null,
    serviceSlug: application.service_slug ?? null,
    saleAmount: safeNumber(application.amount),
    payoutSnapshot: application.agent_payout_snapshot,
    tierId: (partner?.tier_id as string | null) ?? null,
  });

  if (resolved.amount <= 0) {
    // Nothing here is recoverable by retrying, and it is always a
    // misconfiguration rather than a genuinely unpaid sale, so make it findable.
    console.warn("[ap-settlement] zero_commission_not_settled", {
      applicationId: params.applicationId,
      agencyPartnerId: partnerId,
      serviceSlug: application.service_slug,
      reason:
        "no payout snapshot, no service payout, and no commission rule matched — set the service's agent payout or add a rule at /admin/commission-rules",
    });
    return { ok: true, settled: false, amount: 0, source: "none", walletChanged: false };
  }

  // Reuse an existing row so a re-completion tops nothing up and the audit
  // trail keeps pointing at the original commission.
  const { data: existing } = await supabase
    .from("ap_commissions")
    .select("id, status")
    .eq("application_id", params.applicationId)
    .maybeSingle();

  let commissionId = existing?.id ? String(existing.id) : null;

  if (!commissionId) {
    const { data: inserted, error: insertError } = await supabase
      .from("ap_commissions")
      .insert({
        agency_partner_id: partnerId,
        application_id: params.applicationId,
        commission_rule_id: resolved.ruleId,
        service_slug: application.service_slug,
        service_name: application.service_name,
        sale_amount: safeNumber(application.amount),
        commission_type: resolved.commissionType,
        commission_value: resolved.amount,
        commission_rate: resolved.commissionRate,
        calculated_amount: resolved.amount,
        rule_snapshot: resolved.ruleSnapshot,
        status: "approved",
        approved_by: params.actorId,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (insertError && insertError.code !== "23505") {
      console.error("[ap-settlement] commission_insert_failed", {
        applicationId: params.applicationId,
        error: insertError.message,
      });
      return { ok: false, error: "Commission could not be recorded." };
    }

    if (inserted?.id) {
      commissionId = String(inserted.id);
      try {
        await logCommissionStatusChange(
          commissionId,
          null,
          "approved",
          params.actorId,
          "Auto-approved on application completion",
        );
      } catch (auditError) {
        console.error("[ap-settlement] audit_log_failed", auditError);
      }
    } else {
      // A concurrent completion won the insert; adopt its row.
      const { data: raced } = await supabase
        .from("ap_commissions")
        .select("id")
        .eq("application_id", params.applicationId)
        .maybeSingle();
      commissionId = raced?.id ? String(raced.id) : null;
    }
  }

  if (!commissionId) {
    return { ok: false, error: "Commission could not be recorded." };
  }

  // Credit before marking approved, so a wallet failure leaves the commission
  // un-approved and retryable rather than approved with no money moved.
  const credited = await creditCommission({
    agencyPartnerId: partnerId,
    commissionId,
    amount: resolved.amount,
    serviceName: application.service_name ?? undefined,
  });

  if (!credited.ok) {
    console.error("[ap-settlement] wallet_credit_failed", {
      applicationId: params.applicationId,
      commissionId,
      error: credited.error,
    });
    return { ok: false, error: credited.error || "Wallet credit failed." };
  }

  if (existing && existing.status !== "approved" && existing.status !== "paid") {
    await supabase
      .from("ap_commissions")
      .update({
        status: "approved",
        approved_by: params.actorId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commissionId);

    try {
      await logCommissionStatusChange(
        commissionId,
        String(existing.status ?? "pending"),
        "approved",
        params.actorId,
        "Auto-approved on application completion",
      );
    } catch (auditError) {
      console.error("[ap-settlement] audit_log_failed", auditError);
    }
  }

  return {
    ok: true,
    settled: true,
    amount: resolved.amount,
    source: resolved.source,
    commissionId,
    walletChanged: !credited.deduped,
  };
}
