import "server-only";

import {
  canAdvanceOutboxStatus,
  normalizeProviderDeliveryStatus,
} from "@/lib/communications/comms-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/whatsapp/aisensy";

export type ProviderDeliveryEvent = {
  providerMessageId: string;
  providerEventId: string | null;
  deliveryStatus: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

/**
 * Apply one provider delivery-status event (AiSensy or Meta webhook):
 * log it idempotently, advance the matching outbox row, and copy delivery
 * metadata onto the OTP request that sent it.
 *
 * Outbox update only when exactly one row carries the provider message id.
 * OTP path touches delivery_* metadata only — never codes, hashes or flags.
 */
export async function applyProviderDeliveryEvent(
  provider: string,
  event: ProviderDeliveryEvent,
): Promise<{ ok: boolean; outboxUpdated: boolean; otpDeliveryMetaUpdated: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, outboxUpdated: false, otpDeliveryMetaUpdated: false };

  const providerEventId = event.providerEventId || `${event.providerMessageId}:${event.deliveryStatus || "status"}`;
  const safeError = event.errorMessage ? redactSecrets(event.errorMessage).slice(0, 300) : null;
  const normalized = normalizeProviderDeliveryStatus(event.deliveryStatus);

  await supabase.from("communication_delivery_events").upsert(
    {
      provider,
      provider_event_id: providerEventId,
      provider_message_id: event.providerMessageId,
      raw_status: event.deliveryStatus,
      normalized_status: normalized,
      failure_code: event.errorCode,
      failure_summary: safeError,
    },
    { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
  );

  // Correlate outbox — refuse ambiguous multi-row matches (legacy duplicate provider IDs)
  const { data: matches } = await supabase
    .from("whatsapp_messages")
    .select("id, status")
    .eq("provider_message_id", event.providerMessageId)
    .limit(3);

  let outboxUpdated = false;
  if ((matches?.length ?? 0) > 1) {
    console.error(`[${provider}-webhook] ambiguous_provider_message_id`, {
      code: "ambiguous_provider_message_id",
      matchCount: matches?.length,
    });
  } else if (matches?.length === 1 && normalized) {
    const outbox = matches[0];
    if (canAdvanceOutboxStatus(String(outbox.status), normalized)) {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: normalized,
        provider_status: event.deliveryStatus,
        updated_at: now,
      };
      if (normalized === "delivered") patch.delivered_at = now;
      if (normalized === "read") patch.read_at = now;
      if (normalized === "failed") {
        patch.failed_at = now;
        patch.failure_code = event.errorCode;
        patch.failure_summary = safeError;
      }
      const { error } = await supabase
        .from("whatsapp_messages")
        .update(patch)
        .eq("id", outbox.id)
        .eq("provider_message_id", event.providerMessageId);
      outboxUpdated = !error;
      if (outboxUpdated) {
        await supabase
          .from("communication_delivery_events")
          .update({ outbox_id: outbox.id })
          .eq("provider", provider)
          .eq("provider_event_id", providerEventId);
      }
    }
  }

  let otpDeliveryMetaUpdated = false;
  if (event.deliveryStatus) {
    const { data: rows } = await supabase
      .from("auth_otp_requests")
      .select("id, metadata")
      .order("created_at", { ascending: false })
      .limit(50);

    const match = (rows ?? []).find((row) => {
      const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
      return String(meta.submitted_message_id ?? "") === event.providerMessageId;
    });

    if (match) {
      const previous =
        match.metadata && typeof match.metadata === "object" ? (match.metadata as Record<string, unknown>) : {};
      const { error } = await supabase
        .from("auth_otp_requests")
        .update({
          metadata: {
            ...previous,
            delivery_status: String(event.deliveryStatus).toLowerCase(),
            provider_delivery_status: event.deliveryStatus,
            provider_delivery_error_code: event.errorCode,
            provider_delivery_error: safeError,
            provider_delivery_updated_at: new Date().toISOString(),
          },
        })
        .eq("id", match.id);
      otpDeliveryMetaUpdated = !error;
    }
  }

  return { ok: true, outboxUpdated, otpDeliveryMetaUpdated };
}
