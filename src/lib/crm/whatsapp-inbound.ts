import "server-only";

import { ingestLead } from "@/lib/crm/leads";
import { isValidLeadMobile, normalizeLeadMobile } from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MetaInboundMessage } from "@/lib/whatsapp/meta-cloud";

/**
 * A customer's WhatsApp message into the CRM — through the existing lead
 * pipeline, not a second message store:
 *
 * - An open lead for that number (not won / lost) gets the message on its
 *   activity timeline (`lead_activities`, type `whatsapp_inbound`).
 * - Otherwise a new `whatsapp` lead is created with `ingestLead`, and the
 *   message goes on its timeline.
 * - The wamid is the idempotency key (`lead_ingestion_keys`,
 *   `whatsapp_inbound:{wamid}`): Meta redelivers webhooks, and a redelivered
 *   message is recognised and skipped.
 * - "STOP" / "UNSUBSCRIBE" from a known customer turns off promotional
 *   WhatsApp for them (transactional updates continue), with history.
 */

export type InboundOutcome =
  | { status: "duplicate"; leadId: string | null }
  | { status: "activity_added" | "lead_created"; leadId: string; optedOut: boolean }
  | { status: "ignored"; reason: string }
  | { status: "error"; reason: string };

const CLOSED_STAGES = new Set(["won", "lost"]);
const OPT_OUT = /^\s*(stop|unsubscribe|opt[\s-]?out|band karo)\s*[.!]*\s*$/i;

export function inboundIdempotencyKey(messageId: string): string {
  return `whatsapp_inbound:${messageId}`.slice(0, 240);
}

export function isOptOutMessage(text: string | null): boolean {
  return Boolean(text && OPT_OUT.test(text));
}

function timelineBody(message: MetaInboundMessage): string {
  if (message.text) return message.text;
  return `[${message.type} message]`;
}

async function optOutPromotional(mobile: string, messageId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("mobile", mobile)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!customer?.id) return false;

  const now = new Date().toISOString();
  const snapshot = {
    opt_out_promotional: true,
    promotional_whatsapp_consent: false,
    consent_source: "whatsapp_stop_keyword",
    consent_at: now,
  };
  const { error } = await supabase
    .from("customer_communication_preferences")
    .upsert({ customer_id: customer.id, ...snapshot, updated_at: now }, { onConflict: "customer_id" });
  if (error) return false;
  await supabase.from("customer_communication_preference_history").insert({
    customer_id: customer.id,
    snapshot,
    reason: `WhatsApp STOP (${messageId})`,
  });
  return true;
}

export async function recordInboundWhatsAppMessage(message: MetaInboundMessage): Promise<InboundOutcome> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { status: "error", reason: "supabase_unavailable" };

  const mobile = normalizeLeadMobile(message.from);
  if (!isValidLeadMobile(mobile)) return { status: "ignored", reason: "not_an_indian_mobile" };

  // Idempotency: one row per wamid. Checked first (redeliveries are the common
  // case), and the insert's unique key catches a concurrent duplicate.
  const key = inboundIdempotencyKey(message.messageId);
  const { data: seen } = await supabase.from("lead_ingestion_keys").select("lead_id").eq("key", key).maybeSingle();
  if (seen) return { status: "duplicate", leadId: seen.lead_id ? String(seen.lead_id) : null };

  const claim = await supabase
    .from("lead_ingestion_keys")
    .insert({ key, source: "whatsapp", response: { type: message.type } });
  if (claim.error) {
    if (/duplicate|unique|23505/i.test(`${claim.error.code ?? ""} ${claim.error.message ?? ""}`)) {
      return { status: "duplicate", leadId: null };
    }
    return { status: "error", reason: "claim_failed" };
  }

  // From here on, a failure releases the claim so Meta's retry can process it.
  const release = async (reason: string): Promise<InboundOutcome> => {
    await supabase.from("lead_ingestion_keys").delete().eq("key", key);
    return { status: "error", reason };
  };

  const { data: recent, error: leadError } = await supabase
    .from("leads")
    .select("id, pipeline_stage")
    .eq("mobile_normalized", mobile)
    .order("last_activity_at", { ascending: false })
    .limit(5);
  if (leadError) return release("lead_lookup_failed");

  let leadId =
    (recent ?? []).find((row) => !CLOSED_STAGES.has(String(row.pipeline_stage ?? "")))?.id ?? null;
  let status: "activity_added" | "lead_created" = "activity_added";

  if (!leadId) {
    const created = await ingestLead({
      source: "whatsapp",
      name: message.profileName && message.profileName.length >= 2 ? message.profileName : "WhatsApp customer",
      mobile,
      message: message.text,
      campaignAttribution: "whatsapp_inbound",
      externalId: message.messageId,
    });
    if (!created.ok) return release("lead_create_failed");
    leadId = created.leadId;
    status = "lead_created";
  }

  const now = new Date().toISOString();
  const { error: activityError } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "whatsapp_inbound",
    body: timelineBody(message),
    actor_role: "customer",
    metadata: {
      whatsapp_message_id: message.messageId,
      message_type: message.type,
      profile_name: message.profileName,
      received_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : now,
    },
  });
  if (activityError) return release("activity_insert_failed");

  await supabase.from("leads").update({ last_activity_at: now }).eq("id", leadId);
  await supabase
    .from("lead_ingestion_keys")
    .update({ lead_id: leadId, response: { type: message.type, outcome: status } })
    .eq("key", key);

  const optedOut = isOptOutMessage(message.text) ? await optOutPromotional(mobile, message.messageId) : false;
  return { status, leadId: String(leadId), optedOut };
}
