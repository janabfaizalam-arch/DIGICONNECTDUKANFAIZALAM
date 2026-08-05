import "server-only";

import { ingestLead } from "@/lib/crm/leads";
import {
  normalizeInboundLeadSource,
  normalizeLeadMobile,
  type LeadSource,
} from "@/lib/crm/leads-core";

/**
 * Provider-neutral inbound lead adapters.
 * WhatsApp / Sheets are READY but NOT activated — no live webhook enablement here.
 *
 * WhatsApp / AiSensy readiness (inactive until explicitly configured):
 * - Authenticity: shared secret header `x-aisensy-webhook-secret` (existing delivery webhook pattern).
 *   Do not invent HMAC schemes the account does not support.
 * - Event/message ID → externalId for idempotency + replay protection via lead_ingestion_keys.
 * - Delivery-status webhook (`/api/webhooks/aisensy`) stays SEPARATE from lead ingest.
 * - Consent/source metadata via campaignAttribution / notes only (no raw auth headers stored).
 * - Required env names (no values): AISENSY_WEBHOOK_SECRET (+ existing AiSensy campaign envs).
 * - Leave lead-ingest route disabled until approval; unknown events should 202/ignore safely.
 *
 * Google Sheets readiness (inactive; DB authoritative for leads):
 * - No dual-write loop: outbound CRM sync is applications/customers only.
 * - Stable external row id → externalId `sheets:{rowId}`.
 * - Conflict: DB wins for lead fields; sheet edits do not overwrite converted leads.
 * - Deletion: sheet row delete does not delete leads; mark cancelled via admin if needed.
 * - Env names only: GOOGLE_SHEETS_* (existing outbound).
 */

export type InboundLeadPayload = {
  name: string;
  mobile: string;
  service?: string | null;
  message?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  campaignAttribution?: string | null;
  referralCode?: string | null;
  externalId?: string | null;
  sourceHint?: string | null;
};

export async function ingestWebsiteLead(payload: InboundLeadPayload) {
  return ingestLead({
    source: "website",
    name: payload.name,
    mobile: normalizeLeadMobile(payload.mobile),
    service: payload.service,
    message: payload.message,
    email: payload.email,
    city: payload.city,
    address: payload.address,
    notes: payload.notes,
    campaignAttribution: payload.campaignAttribution,
    referralCode: payload.referralCode,
    externalId: payload.externalId,
  });
}

export async function ingestAgencyPartnerLead(
  payload: InboundLeadPayload & { actorId: string },
) {
  return ingestLead({
    source: "agency_partner",
    name: payload.name,
    mobile: normalizeLeadMobile(payload.mobile),
    service: payload.service,
    message: payload.message,
    email: payload.email,
    city: payload.city,
    address: payload.address,
    notes: payload.notes,
    campaignAttribution: payload.campaignAttribution,
    referralCode: payload.referralCode,
    externalId: payload.externalId,
    actorId: payload.actorId,
  });
}

export async function ingestManualAdminLead(
  payload: InboundLeadPayload & { actorId: string },
) {
  return ingestLead({
    source: "manual",
    name: payload.name,
    mobile: normalizeLeadMobile(payload.mobile),
    service: payload.service,
    message: payload.message,
    email: payload.email,
    city: payload.city,
    address: payload.address,
    notes: payload.notes,
    campaignAttribution: payload.campaignAttribution,
    referralCode: payload.referralCode,
    externalId: payload.externalId,
    actorId: payload.actorId,
    actorIsAdmin: true,
  });
}

/** WhatsApp-ready: requires provider message id as externalId for idempotency. Inactive until webhook wired. */
export async function ingestWhatsAppReadyLead(payload: InboundLeadPayload) {
  if (!payload.externalId?.trim()) {
    return { ok: false as const, error: "WhatsApp externalId (message id) is required.", status: 400 };
  }
  return ingestLead({
    source: "whatsapp",
    name: payload.name,
    mobile: normalizeLeadMobile(payload.mobile),
    service: payload.service,
    message: payload.message,
    email: payload.email,
    notes: payload.notes,
    campaignAttribution: payload.campaignAttribution,
    externalId: payload.externalId,
  });
}

/**
 * Sheets-ready inbound. Conflict rule: database is authoritative for leads.
 * Do not enable Sheets→leads writers that also mirror leads outbound (loop risk).
 * Prefer unique sheet row key as externalId.
 */
export async function ingestSheetsReadyLead(payload: InboundLeadPayload) {
  if (!payload.externalId?.trim()) {
    return { ok: false as const, error: "Sheets row externalId is required.", status: 400 };
  }
  const source: LeadSource = normalizeInboundLeadSource(payload.sourceHint || "manual");
  return ingestLead({
    source: source === "website" ? "manual" : source,
    name: payload.name,
    mobile: normalizeLeadMobile(payload.mobile),
    service: payload.service,
    message: payload.message,
    email: payload.email,
    notes: payload.notes,
    campaignAttribution: payload.campaignAttribution || "google_sheets",
    externalId: `sheets:${payload.externalId}`,
  });
}
