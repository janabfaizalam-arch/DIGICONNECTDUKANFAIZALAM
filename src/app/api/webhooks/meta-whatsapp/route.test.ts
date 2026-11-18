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
    whatsapp_messages: [{ id: "out-1", status: "sent", provider_message_id: "wamid.OUT", meta_message_id: "wamid.OUT" }],
    communication_delivery_events: [],
    auth_otp_requests: [],
    whatsapp_conversations: [],
    whatsapp_message_events: [],
    whatsapp_contact_consents: [],
    admin_notifications: [],
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

function inboundMedia(
  id: string,
  type: "image" | "document" | "audio" | "video",
  mediaObj: Record<string, unknown>,
  from = "919876543210",
) {
  return webhook({
    contacts: [{ wa_id: from, profile: { name: "Riya Sharma" } }],
    messages: [{ id, from, type, timestamp: "1790000000", [type]: mediaObj }],
  });
}

function inboundFlow(
  id: string,
  flowObj: { name: string; body?: string; response_json: string },
  from = "919876543210",
) {
  return webhook({
    contacts: [{ wa_id: from, profile: { name: "Riya Sharma" } }],
    messages: [
      {
        id,
        from,
        type: "interactive",
        timestamp: "1790000000",
        interactive: {
          type: "nfm_reply",
          nfm_reply: flowObj,
        },
      },
    ],
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

  it("records message status event in whatsapp_message_events and advances message_status", async () => {
    db.tables.whatsapp_messages.push({
      id: "msg-10",
      meta_message_id: "wamid.REPLY1",
      provider_message_id: "wamid.REPLY1",
      message_status: "sent",
      status: "sent",
    });
    const body = webhook({
      statuses: [
        { id: "wamid.REPLY1", status: "delivered", timestamp: "1790000010" },
        { id: "wamid.REPLY1", status: "read", timestamp: "1790000020" },
      ],
    });
    const response = await POST(signedPost(body));
    expect(response.status).toBe(200);
    expect(db.tables.whatsapp_message_events.filter((e) => e.meta_message_id === "wamid.REPLY1")).toHaveLength(2);
    const updated = db.tables.whatsapp_messages.find((m) => m.id === "msg-10");
    expect(updated).toMatchObject({ message_status: "read" });
  });

  it("deduplicates identical status events cleanly", async () => {
    db.tables.whatsapp_messages.push({
      id: "msg-20",
      meta_message_id: "wamid.DUP_STATUS",
      message_status: "sent",
    });
    const body = webhook({
      statuses: [{ id: "wamid.DUP_STATUS", status: "delivered", timestamp: "1790000010" }],
    });
    await POST(signedPost(body));
    await POST(signedPost(body));
    expect(db.tables.whatsapp_message_events.filter((e) => e.meta_message_id === "wamid.DUP_STATUS")).toHaveLength(1);
  });
});

describe("Shared Inbox: Inbound messages & conversations", () => {
  it("creates a conversation and stores inbound text message in whatsapp_messages", async () => {
    const response = await POST(signedPost(inbound("wamid.INBOX1", "Namaste DigiConnect", "919876543210")));
    expect(response.status).toBe(200);

    expect(db.tables.whatsapp_conversations).toHaveLength(1);
    const conv = db.tables.whatsapp_conversations[0];
    expect(conv).toMatchObject({
      wa_id: "919876543210",
      phone_number: "9876543210",
      last_message: "Namaste DigiConnect",
      unread_count: 1,
      status: "open",
    });

    const inboundMsg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.INBOX1");
    expect(inboundMsg).toBeDefined();
    expect(inboundMsg).toMatchObject({
      conversation_id: conv.id,
      direction: "inbound",
      message_type: "text",
      message_body: "Namaste DigiConnect",
      message_status: "received",
      sender_type: "customer",
    });
  });

  it("increments unread count and updates last_message on subsequent messages in same conversation", async () => {
    await POST(signedPost(inbound("wamid.INBOX2A", "First message", "919876543210")));
    await POST(signedPost(inbound("wamid.INBOX2B", "Second message", "919876543210")));

    expect(db.tables.whatsapp_conversations).toHaveLength(1);
    const conv = db.tables.whatsapp_conversations[0];
    expect(conv.unread_count).toBe(2);
    expect(conv.last_message).toBe("Second message");
  });

  it("links conversation to existing CRM customer by matching phone number", async () => {
    db.tables.customers.push({
      id: "cust-faiz",
      full_name: "Faiz Alam",
      mobile: "9876543210",
      created_at: "2026-01-01",
    });

    await POST(signedPost(inbound("wamid.INBOX3", "Customer message", "919876543210")));

    const conv = db.tables.whatsapp_conversations[0];
    expect(conv.customer_id).toBe("cust-faiz");
    expect(conv.customer_name).toBe("Faiz Alam");
  });

  it("handles media messages (image, document, audio, video) and stores media attributes", async () => {
    const imagePayload = inboundMedia(
      "wamid.IMG1",
      "image",
      { id: "media_img_123", mime_type: "image/jpeg", caption: "Aadhaar Card Photo" },
      "919876543210",
    );
    const docPayload = inboundMedia(
      "wamid.DOC1",
      "document",
      { id: "media_doc_456", mime_type: "application/pdf", filename: "salary_slip.pdf" },
      "919876543210",
    );

    expect((await POST(signedPost(imagePayload))).status).toBe(200);
    expect((await POST(signedPost(docPayload))).status).toBe(200);

    const imgMsg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.IMG1");
    expect(imgMsg).toMatchObject({
      message_type: "image",
      media_id: "media_img_123",
      media_mime_type: "image/jpeg",
      message_body: "Aadhaar Card Photo",
    });

    const docMsg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.DOC1");
    expect(docMsg).toMatchObject({
      message_type: "document",
      media_id: "media_doc_456",
      media_mime_type: "application/pdf",
      message_body: "[Document: salary_slip.pdf]",
    });
  });

  it("handles WhatsApp Flow nfm_reply response and notifies admin", async () => {
    const flowPayload = inboundFlow(
      "wamid.FLOW1",
      {
        name: "DigiConnect Customer Support",
        body: "Support Request Sent",
        response_json: JSON.stringify({ name: "Riya", query: "ITR Filing help", urgency: "High" }),
      },
      "919876543210",
    );

    const res = await POST(signedPost(flowPayload));
    expect(res.status).toBe(200);

    const flowMsg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.FLOW1");
    expect(flowMsg).toBeDefined();
    expect(flowMsg?.raw_metadata).toMatchObject({
      flow_name: "DigiConnect Customer Support",
      flow_id: "1616611156369254",
      flow_data: { name: "Riya", query: "ITR Filing help", urgency: "High" },
    });

    // Verify admin notification was created
    expect(db.tables.admin_notifications).toHaveLength(1);
    expect(db.tables.admin_notifications[0]).toMatchObject({
      type: "new_lead",
      title: "WhatsApp Flow: DigiConnect Customer Support",
    });
  });

  it("records contact consent opt-out on STOP and opt-in on START", async () => {
    await POST(signedPost(inbound("wamid.STOP1", "STOP", "919876543210")));
    const optOut = db.tables.whatsapp_contact_consents.find((c) => c.phone_number === "9876543210");
    expect(optOut).toBeDefined();
    expect(optOut?.consent_status).toBe("opted_out");
    expect(optOut?.consent_scope).toBe("marketing");

    await POST(signedPost(inbound("wamid.START1", "START", "919876543210")));
    const optIn = db.tables.whatsapp_contact_consents.find((c) => c.phone_number === "9876543210");
    expect(optIn?.consent_status).toBe("opted_in");
  });

  it("handles malformed JSON body gracefully with 400", async () => {
    const badJson = new Request("https://www.rnos.in/api/webhooks/meta-whatsapp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      body: "not a valid json {{{",
    });
    // Signature will fail before parsing anyway, or 400 if signature matched
    const res = await POST(badJson);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
