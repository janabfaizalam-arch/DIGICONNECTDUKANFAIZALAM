import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminNotification } from "@/lib/admin-notifications";
import { ingestLead } from "@/lib/crm/leads";
import { normalizeLeadMobile } from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const FLOW_CUSTOMER_SUPPORT_ID = "1616611156369254";
export const FLOW_CUSTOMER_SUPPORT_NAME = "DigiConnect Customer Support";

export type ParsedCustomerSupportFlow = {
  flowId: string;
  flowName: string;
  name: string;
  service: string | null;
  issue: string | null;
  city: string | null;
  pincode: string | null;
  email: string | null;
  urgency: string | null;
  summary: string;
  rawFields: Record<string, unknown>;
};

/**
 * Validates and safely extracts structured fields from the Meta WhatsApp Flow response JSON.
 */
export function parseCustomerSupportFlowResponse(
  responseJson: string | null | undefined,
  fallbackProfileName?: string | null,
): ParsedCustomerSupportFlow | null {
  if (!responseJson) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = typeof responseJson === "string" ? JSON.parse(responseJson) : responseJson;
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  // Extract name with aliases
  const rawName =
    parsed.name ??
    parsed.customer_name ??
    parsed.full_name ??
    fallbackProfileName ??
    "WhatsApp Customer";
  const name = String(rawName).trim().slice(0, 100) || "WhatsApp Customer";

  // Extract service with aliases
  const rawService =
    parsed.service ??
    parsed.service_category ??
    parsed.service_type ??
    parsed.department ??
    null;
  const service = rawService ? String(rawService).trim().slice(0, 120) : null;

  // Extract issue/message with aliases
  const rawIssue =
    parsed.issue ??
    parsed.message ??
    parsed.query ??
    parsed.details ??
    parsed.description ??
    null;
  const issue = rawIssue ? String(rawIssue).trim().slice(0, 2000) : null;

  // Extract location fields
  const city = parsed.city ? String(parsed.city).trim().slice(0, 100) : null;
  const pincode = parsed.pincode ? String(parsed.pincode).trim().replace(/\D/g, "").slice(0, 6) : null;
  const email = parsed.email ? String(parsed.email).trim().toLowerCase().slice(0, 150) : null;
  const urgency = parsed.urgency ? String(parsed.urgency).trim().slice(0, 50) : null;

  // Build a readable summary
  const summaryParts: string[] = [];
  if (service) summaryParts.push(`Service: ${service}`);
  if (issue) summaryParts.push(`Issue: ${issue}`);
  if (city) summaryParts.push(`City: ${city}`);
  if (urgency) summaryParts.push(`Urgency: ${urgency}`);
  const summary = summaryParts.length ? summaryParts.join(" | ") : "Customer Support Flow Enquiry";

  return {
    flowId: FLOW_CUSTOMER_SUPPORT_ID,
    flowName: FLOW_CUSTOMER_SUPPORT_NAME,
    name,
    service,
    issue,
    city,
    pincode,
    email,
    urgency,
    summary,
    rawFields: parsed,
  };
}

export type SyncFlowResult =
  | { ok: true; leadId: string; isDuplicate: boolean }
  | { ok: false; error: string; status: number };

/**
 * Maps submitted WhatsApp Flow fields directly into CRM leads, creates a lead timeline activity,
 * and attaches the lead to the WhatsApp conversation. Idempotent on messageId.
 */
export async function syncFlowResponseToCrm(input: {
  flow: ParsedCustomerSupportFlow;
  mobile: string;
  messageId: string;
  conversationId: string;
  supabaseOverride?: SupabaseClient | null;
}): Promise<SyncFlowResult> {
  const supabase = input.supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const mobileNormalized = normalizeLeadMobile(input.mobile);
  const idempotencyKey = `whatsapp_flow:${input.messageId}`;

  // 1. Idempotency check: see if this Flow message ID was already processed into CRM leads
  const { data: seenKey } = await supabase
    .from("lead_ingestion_keys")
    .select("lead_id")
    .eq("key", idempotencyKey)
    .maybeSingle();

  if (seenKey?.lead_id) {
    return { ok: true, leadId: String(seenKey.lead_id), isDuplicate: true };
  }

  // 2. Ingest lead using existing CRM leads ingest pipeline
  const ingested = await ingestLead({
    source: "whatsapp",
    name: input.flow.name,
    mobile: mobileNormalized,
    service: input.flow.service,
    message: input.flow.issue || input.flow.summary,
    city: input.flow.city,
    email: input.flow.email,
    notes: `[Flow: ${input.flow.flowName}] ${input.flow.summary}`,
    campaignAttribution: "whatsapp_flow_support",
    externalId: idempotencyKey,
  });

  if (!ingested.ok) {
    return { ok: false, error: "Failed to ingest lead from Flow response", status: 500 };
  }

  const leadId = ingested.leadId;
  const now = new Date().toISOString();

  // Record idempotency claim
  await supabase.from("lead_ingestion_keys").upsert({
    key: idempotencyKey,
    source: "whatsapp",
    lead_id: leadId,
    response: { ok: true, leadId },
  });

  // 3. Insert lead timeline activity
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "whatsapp_inbound",
    body: `[WhatsApp Flow: ${input.flow.flowName}] ${input.flow.summary}`,
    actor_role: "customer",
    metadata: {
      flow_id: input.flow.flowId,
      flow_name: input.flow.flowName,
      whatsapp_message_id: input.messageId,
      conversation_id: input.conversationId,
      flow_fields: input.flow.rawFields,
      received_at: now,
    },
  });

  // 4. Update conversation metadata and name if necessary
  const { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("metadata, customer_name")
    .eq("id", input.conversationId)
    .maybeSingle();

  const currentMeta = (conv?.metadata || {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {
    metadata: {
      ...currentMeta,
      crm_lead_id: leadId,
      latest_flow_submission: {
        flow_id: input.flow.flowId,
        submitted_at: now,
      },
    },
    updated_at: now,
  };

  if (!conv?.customer_name || conv.customer_name === "WhatsApp Customer") {
    patch.customer_name = input.flow.name;
  }

  await supabase.from("whatsapp_conversations").update(patch).eq("id", input.conversationId);

  // 5. Generate admin notification
  await createAdminNotification(supabase, {
    type: "new_lead",
    title: `WhatsApp Flow: ${input.flow.flowName}`,
    message: `${input.flow.name} (${mobileNormalized}): ${input.flow.summary.slice(0, 140)}`,
    relatedType: "lead",
    relatedId: leadId,
  });

  return { ok: true, leadId, isDuplicate: false };
}
