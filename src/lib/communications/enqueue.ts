import "server-only";

import { randomUUID } from "crypto";

import {
  buildCommunicationIdempotencyKey,
  maskMobile,
  purposeClassification,
  type CommunicationClassification,
  type CommunicationPurpose,
} from "@/lib/communications/comms-core";
import { normalizeLeadMobile, isValidLeadMobile } from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getApplicationCampaignName } from "@/lib/whatsapp/templates";

export type EnqueueCommunicationInput = {
  purpose: CommunicationPurpose | string;
  channel?: "whatsapp" | "internal_alert";
  recipientMobile: string;
  customerId?: string | null;
  applicationId?: string | null;
  leadId?: string | null;
  paymentId?: string | null;
  followUpId?: string | null;
  /** Stable business-event key parts — NOT a random retry client key alone */
  eventKeyParts: string[];
  templateParams?: string[];
  userName?: string;
  campaignName?: string | null;
  classification?: CommunicationClassification;
  consentBasis?: string | null;
  correlationId?: string | null;
  createdBy?: string | null;
  safePayload?: Record<string, unknown>;
  maxAttempts?: number;
  /** Override when preserving a legacy key format (e.g. applicationId:event:version). */
  idempotencyKey?: string;
};

export type EnqueueResult =
  | { ok: true; id: string; deduped: boolean; status: string }
  | { ok: false; error: string; status: number; code?: string };

/**
 * Canonical enqueue — inserts queued outbox row only. Never calls AiSensy.
 * Idempotent on event-scoped key. Changing a random clientKey must not duplicate
 * the same business event when eventKeyParts are stable.
 */
export async function enqueueCommunication(input: EnqueueCommunicationInput): Promise<EnqueueResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const mobile = normalizeLeadMobile(input.recipientMobile);
  if (input.channel !== "internal_alert" && !isValidLeadMobile(mobile)) {
    return { ok: false, error: "Invalid recipient mobile.", status: 400, code: "invalid_mobile" };
  }

  const classification = purposeClassification(input.purpose);
  // Ignore client-supplied classification override for security — purpose maps server-side.
  void input.classification;
  if (classification === "promotional" && input.customerId) {
    const allowed = await isPromotionalWhatsAppAllowed(input.customerId);
    if (!allowed) {
      const suppressedKey = buildCommunicationIdempotencyKey([
        "suppressed",
        input.purpose,
        ...input.eventKeyParts,
      ]);
      const { data: row } = await supabase
        .from("whatsapp_messages")
        .upsert(
          {
            application_id: input.applicationId ?? null,
            customer_id: input.customerId,
            lead_id: input.leadId ?? null,
            channel: input.channel ?? "whatsapp",
            provider: "aisensy",
            event_type: input.purpose,
            purpose: input.purpose,
            template_name: input.campaignName ?? null,
            recipient: mobile || "suppressed",
            status: "suppressed",
            idempotency_key: suppressedKey,
            classification,
            consent_basis: "promotional_opt_in_missing",
            correlation_id: input.correlationId ?? randomUUID(),
            payload: { reason: "promotional_consent_absent" },
            failure_code: "consent_suppressed",
            failure_summary: "Promotional WhatsApp suppressed — no explicit consent.",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "idempotency_key" },
        )
        .select("id, status")
        .maybeSingle();
      return {
        ok: true,
        id: String(row?.id ?? ""),
        deduped: true,
        status: "suppressed",
      };
    }
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    buildCommunicationIdempotencyKey([input.purpose, ...input.eventKeyParts]);
  const campaignName =
    input.campaignName ||
    (input.purpose.startsWith("application") || input.purpose.includes("payment") || input.purpose.includes("document")
      ? getApplicationCampaignName(input.purpose as never)
      : null);

  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { ok: true, id: String(existing.id), deduped: true, status: String(existing.status) };
  }

  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      application_id: input.applicationId ?? null,
      customer_id: input.customerId ?? null,
      lead_id: input.leadId ?? null,
      payment_id: input.paymentId ?? null,
      follow_up_id: input.followUpId ?? null,
      channel: input.channel ?? "whatsapp",
      provider: "aisensy",
      event_type: input.purpose,
      purpose: input.purpose,
      template_name: campaignName,
      recipient: mobile,
      status: "queued",
      idempotency_key: idempotencyKey,
      classification,
      consent_basis: input.consentBasis ?? (classification === "transactional" ? "transactional_ops" : null),
      correlation_id: input.correlationId ?? randomUUID(),
      created_by: input.createdBy ?? null,
      max_attempts: input.maxAttempts ?? 5,
      next_attempt_at: now,
      payload: {
        user_name: input.userName ?? null,
        template_params: input.templateParams ?? [],
        ...(input.safePayload ?? {}),
      },
      safe_metadata: {
        recipient_masked: maskMobile(mobile),
      },
      created_at: now,
      updated_at: now,
    })
    .select("id, status")
    .maybeSingle();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      const { data: again } = await supabase
        .from("whatsapp_messages")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (again) return { ok: true, id: String(again.id), deduped: true, status: String(again.status) };
    }
    if (/PGRST205|42P01|does not exist|schema cache/i.test(error.message)) {
      return { ok: false, error: "Database upgrade required for communication outbox.", status: 503, code: "upgrade_required" };
    }
    console.error("[comms-enqueue] failed", { code: "enqueue_failed" });
    return { ok: false, error: "Could not enqueue communication.", status: 500 };
  }

  return { ok: true, id: String(row?.id), deduped: false, status: String(row?.status ?? "queued") };
}

export async function isPromotionalWhatsAppAllowed(customerId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase
    .from("customer_communication_preferences")
    .select("promotional_whatsapp_consent, opt_out_promotional")
    .eq("customer_id", customerId)
    .maybeSingle();

  // Unknown preference = not opted in for promotional.
  if (!data) return false;
  if (data.opt_out_promotional) return false;
  return Boolean(data.promotional_whatsapp_consent);
}

export async function isTransactionalWhatsAppAllowed(customerId: string | null | undefined): Promise<boolean> {
  if (!customerId) return true;
  const supabase = getSupabaseAdmin();
  if (!supabase) return true;
  const { data } = await supabase
    .from("customer_communication_preferences")
    .select("transactional_whatsapp_allowed")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!data) return true;
  return data.transactional_whatsapp_allowed !== false;
}
