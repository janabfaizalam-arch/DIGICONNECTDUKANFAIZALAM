/**
 * The Meta WhatsApp webhook against the real route handler. Only the database
 * (an in-memory FakeSupabase) and lead creation are replaced.
 */

import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

const ingestLead = vi.fn();
vi.mock("@/lib/crm/leads", () => ({ ingestLead: (...args: unknown[]) => ingestLead(...args) }));

import { GET, POST } from "@/app/api/webhooks/meta-whatsapp/route";

const APP_SECRET = "meta-app-secret-for-tests";
const VERIFY = "rnos_whatsapp_verify_2026";
const PHONE_ID = "1303931342795977";
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [key, value] of Object.entries({
    META_APP_SECRET: APP_SECRET,
    META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: VERIFY,
    META_WHATSAPP_PHONE_NUMBER_ID: PHONE_ID,
  })) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  db = new FakeSupabase({
    leads: [],
    lead_activities: [],
    lead_ingestion_keys: [],
    customers: [],
    customer_communication_preferences: [],
    customer_communication_preference_history: [],
    whatsapp_messages: [{ id: "out-1", status: "sent", provider_message_id: "wamid.OUT" }],
    communication_delivery_events: [],
    auth_otp_requests: [],
  });
  ingestLead.mockReset();
  ingestLead.mockImplementation(async (input: { mobile: string; name: string }) => {
    const id = db.nextId();
    db.tables.leads.push({ id, mobile_normalized: input.mobile, name: input.name, pipeline_stage: "new", source: "whatsapp" });
    return { ok: true, leadId: id, deduped: false, duplicates: [] };
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

function verifyRequest(token: string, challenge = "1158201444") {
  return new Request(
    `https://www.rnos.in/api/webhooks/meta-whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=${challenge}`,
  );
}

function signedPost(body: unknown, secret = APP_SECRET) {
  const raw = JSON.stringify(body);
  const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  return new Request("https://www.rnos.in/api/webhooks/meta-whatsapp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": signature },
    body: raw,
  });
}

function webhook(value: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: "1422131553084116", changes: [{ field: "messages", value: { metadata: { phone_number_id: PHONE_ID }, ...value } }] }],
  };
}

function inbound(id: string, text: string, from = "919876543210") {
  return webhook({
    contacts: [{ wa_id: from, profile: { name: "Riya Sharma" } }],
    messages: [{ id, from, type: "text", timestamp: "1790000000", text: { body: text } }],
  });
}

describe("GET verification", () => {
  it("echoes hub.challenge for the right token", async () => {
    const response = await GET(verifyRequest(VERIFY));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("1158201444");
  });

  it("is 403 for a wrong token", async () => {
    expect((await GET(verifyRequest("wrong-token"))).status).toBe(403);
  });

  it("is 503 when the verify token is not configured", async () => {
    delete process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect((await GET(verifyRequest(VERIFY))).status).toBe(503);
  });
});

describe("POST signature", () => {
  it("rejects an unsigned or wrongly signed body", async () => {
    const body = inbound("wamid.X", "hi");
    expect((await POST(signedPost(body, "not-the-secret"))).status).toBe(401);
    const unsigned = new Request("https://www.rnos.in/api/webhooks/meta-whatsapp", {
      method: "POST",
      body: JSON.stringify(body),
    });
    expect((await POST(unsigned)).status).toBe(401);
    expect(db.tables.lead_activities).toHaveLength(0);
  });

  it("is 503 without META_APP_SECRET rather than accepting unverified events", async () => {
    delete process.env.META_APP_SECRET;
    expect((await POST(signedPost(inbound("wamid.X", "hi")))).status).toBe(503);
  });
});

describe("incoming WhatsApp message → CRM", () => {
  it("creates a WhatsApp lead for a new number and puts the message on its timeline", async () => {
    const response = await POST(signedPost(inbound("wamid.IN1", "PAN card ka status?")));
    expect(response.status).toBe(200);
    expect(ingestLead).toHaveBeenCalledOnce();
    expect(ingestLead.mock.calls[0][0]).toMatchObject({
      source: "whatsapp",
      mobile: "9876543210",
      name: "Riya Sharma",
      externalId: "wamid.IN1",
    });
    expect(db.tables.lead_activities).toHaveLength(1);
    expect(db.tables.lead_activities[0]).toMatchObject({
      activity_type: "whatsapp_inbound",
      body: "PAN card ka status?",
      actor_role: "customer",
    });
  });

  it("adds to the open lead instead of creating a second one", async () => {
    db.tables.leads.push({ id: "lead-open", mobile_normalized: "9876543210", pipeline_stage: "contacted" });
    await POST(signedPost(inbound("wamid.IN2", "Documents bhej diye")));
    expect(ingestLead).not.toHaveBeenCalled();
    expect(db.tables.lead_activities[0]).toMatchObject({ lead_id: "lead-open", body: "Documents bhej diye" });
  });

  it("starts a new lead when the only lead for the number is closed", async () => {
    db.tables.leads.push({ id: "lead-won", mobile_normalized: "9876543210", pipeline_stage: "won" });
    await POST(signedPost(inbound("wamid.IN3", "Naya kaam hai")));
    expect(ingestLead).toHaveBeenCalledOnce();
  });

  it("processes a redelivered message once (wamid idempotency)", async () => {
    const body = inbound("wamid.DUP", "Hello");
    expect((await POST(signedPost(body))).status).toBe(200);
    expect((await POST(signedPost(body))).status).toBe(200);
    expect(ingestLead).toHaveBeenCalledOnce();
    expect(db.tables.lead_activities).toHaveLength(1);
    expect(db.tables.lead_ingestion_keys.filter((k) => k.key === "whatsapp_inbound:wamid.DUP")).toHaveLength(1);
  });

  it("asks Meta to retry (500) and releases the claim when the message could not be stored", async () => {
    ingestLead.mockResolvedValueOnce({ ok: false, error: "db down", status: 503 });
    const response = await POST(signedPost(inbound("wamid.FAIL", "Hello")));
    expect(response.status).toBe(500);
    expect(db.tables.lead_ingestion_keys).toHaveLength(0);
    // Meta's retry then succeeds.
    expect((await POST(signedPost(inbound("wamid.FAIL", "Hello")))).status).toBe(200);
    expect(db.tables.lead_activities).toHaveLength(1);
  });

  it("turns off promotional WhatsApp for a known customer who sends STOP", async () => {
    db.tables.customers.push({ id: "cust-1", mobile: "9876543210", created_at: "2026-01-01" });
    await POST(signedPost(inbound("wamid.STOP", "STOP")));
    expect(db.tables.customer_communication_preferences[0]).toMatchObject({
      customer_id: "cust-1",
      opt_out_promotional: true,
    });
    expect(db.tables.customer_communication_preference_history).toHaveLength(1);
  });

  it("ignores messages addressed to a different phone number on the WABA", async () => {
    const body = inbound("wamid.OTHER", "Hello");
    (body.entry[0].changes[0].value as { metadata: { phone_number_id: string } }).metadata.phone_number_id = "999";
    expect((await POST(signedPost(body))).status).toBe(200);
    expect(ingestLead).not.toHaveBeenCalled();
  });
});

describe("delivery statuses", () => {
  it("advances the outbox row and logs the event once", async () => {
    const body = webhook({ statuses: [{ id: "wamid.OUT", status: "delivered", timestamp: "1790000000" }] });
    const response = await POST(signedPost(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ statuses: 1, statusesUpdated: 1 });
    expect(db.tables.whatsapp_messages[0]).toMatchObject({ status: "delivered", provider_status: "delivered" });
    expect(db.tables.communication_delivery_events[0]).toMatchObject({
      provider: "meta",
      provider_message_id: "wamid.OUT",
      normalized_status: "delivered",
    });
  });
});
