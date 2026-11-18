import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

import {
  checkServiceWindow,
  sendInboxReply,
} from "@/lib/whatsapp/inbox-send";
import { recordSharedInboxStatusEvent } from "@/lib/whatsapp/inbox-storage";
import { __resetWhatsAppSendDedupeForTests } from "@/lib/whatsapp/client";

const PHONE_ID = "1303931342795977";
const ACCESS_TOKEN = "EAAG_TEST_TOKEN_FOR_VITEST";

beforeEach(() => {
  __resetWhatsAppSendDedupeForTests();
  process.env.META_WHATSAPP_PHONE_NUMBER_ID = PHONE_ID;
  process.env.META_WHATSAPP_ACCESS_TOKEN = ACCESS_TOKEN;

  db = new FakeSupabase({
    whatsapp_conversations: [
      {
        id: "conv-open-window",
        customer_id: "cust-1",
        wa_id: "919876543210",
        phone_number: "9876543210",
        customer_name: "Riya Sharma",
        last_message: "Hello",
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "conv-closed-window",
        customer_id: null,
        wa_id: "919123456789",
        phone_number: "9123456789",
        customer_name: "Old Contact",
        last_message: "Old message",
        last_message_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        unread_count: 0,
        status: "open",
        created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      },
    ],
    whatsapp_messages: [
      {
        id: "msg-recent-inbound",
        conversation_id: "conv-open-window",
        meta_message_id: "wamid.IN1",
        direction: "inbound",
        message_type: "text",
        message_body: "Hi DigiConnect",
        message_status: "received",
        sender_type: "customer",
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: "msg-old-inbound",
        conversation_id: "conv-closed-window",
        meta_message_id: "wamid.IN2",
        direction: "inbound",
        message_type: "text",
        message_body: "Two days ago",
        message_status: "received",
        sender_type: "customer",
        created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), // 30 hours ago
        timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      },
    ],
    whatsapp_contact_consents: [],
    whatsapp_message_events: [],
  });
});

describe("checkServiceWindow", () => {
  it("returns isOpen: true when customer messaged within 24 hours", async () => {
    const res = await checkServiceWindow("conv-open-window");
    expect(res.isOpen).toBe(true);
    expect(res.hoursRemaining).toBeGreaterThan(20);
  });

  it("returns isOpen: false when customer last messaged > 24 hours ago", async () => {
    const res = await checkServiceWindow("conv-closed-window");
    expect(res.isOpen).toBe(false);
    expect(res.hoursRemaining).toBe(0);
  });

  it("returns isOpen: false when conversation has no inbound messages", async () => {
    const res = await checkServiceWindow("conv-nonexistent");
    expect(res.isOpen).toBe(false);
  });
});

describe("sendInboxReply: Text Messages", () => {
  it("delivers text message when 24h service window is open and records in database", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: "wamid.HBgOUT_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Aapka PAN card ready hai.",
      actorId: "admin-123",
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.providerMessageId).toBe("wamid.HBgOUT_1");
    expect(res.type).toBe("text");

    // Verify outbound message was inserted in whatsapp_messages
    const msg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.HBgOUT_1");
    expect(msg).toBeDefined();
    expect(msg).toMatchObject({
      conversation_id: "conv-open-window",
      direction: "outbound",
      message_type: "text",
      message_body: "Aapka PAN card ready hai.",
      message_status: "sent",
      sender_type: "staff",
      sender_id: "admin-123",
    });

    // Verify conversation last_message was updated
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-open-window");
    expect(conv?.last_message).toBe("Aapka PAN card ready hai.");

    // Verify event was logged in whatsapp_message_events
    expect(db.tables.whatsapp_message_events).toHaveLength(1);
    expect(db.tables.whatsapp_message_events[0]).toMatchObject({
      meta_message_id: "wamid.HBgOUT_1",
      event_type: "sent",
    });
  });

  it("refuses text message outside the 24h service window", async () => {
    const mockFetch = vi.fn();

    const res = await sendInboxReply({
      conversationId: "conv-closed-window",
      type: "text",
      textBody: "Hello customer",
      actorId: "admin-123",
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("outside_service_window");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refuses empty text body", async () => {
    const res = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "   ",
      actorId: "admin-123",
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("empty_text");
  });
});

describe("sendInboxReply: Template Messages", () => {
  it("delivers approved template outside the 24h window", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: "wamid.HBgTEMPLATE_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await sendInboxReply({
      conversationId: "conv-closed-window",
      type: "template",
      templateKey: "application_update",
      templateParams: ["Riya Sharma", "PAN Card", "APP-1234", "Approved"],
      actorId: "admin-123",
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.providerMessageId).toBe("wamid.HBgTEMPLATE_1");
    expect(res.type).toBe("template");

    // Verify outbound template message recorded
    const msg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.HBgTEMPLATE_1");
    expect(msg).toBeDefined();
    expect(msg).toMatchObject({
      conversation_id: "conv-closed-window",
      direction: "outbound",
      message_type: "template",
      message_status: "sent",
    });
  });

  it("records failed message in whatsapp_messages when Meta API rejects send", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: "Template paused by Meta", code: 132015 },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const res = await sendInboxReply({
      conversationId: "conv-closed-window",
      type: "template",
      templateName: "application_status",
      templateParams: ["Riya", "ITR", "123", "Done"],
      actorId: "admin-123",
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("template_not_approved");

    // Verify failed message was recorded in whatsapp_messages
    const failedMsg = db.tables.whatsapp_messages.find((m) => m.message_status === "failed");
    expect(failedMsg).toBeDefined();
    expect(failedMsg?.error_details).toContain("Template paused by Meta");
  });
});

describe("Outbound Persistent Database Idempotency", () => {
  it("prevents double-send under rapid double-click with same requestId", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return new Response(JSON.stringify({ messages: [{ id: "wamid.IDEMPOTENT_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const requestId = "00000000-0000-4000-8000-000000000001";

    // First send succeeds
    const res1 = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Original message",
      actorId: "admin-123",
      requestId,
      fetchImpl: mockFetch,
    });
    expect(res1.ok).toBe(true);
    expect(callCount).toBe(1);

    // Second send with same requestId returns original attempt status without dispatching to Meta again
    const res2 = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Original message",
      actorId: "admin-123",
      requestId,
      fetchImpl: mockFetch,
    });

    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.alreadySent).toBe(true);
      expect(res2.providerMessageId).toBe("wamid.IDEMPOTENT_1");
    }
    // Meta was NOT called a second time
    expect(callCount).toBe(1);
  });

  it("handles concurrent Vercel-style parallel requests safely", async () => {
    let callCount = 0;
    // Delay Meta response slightly to simulate inflight concurrency
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ messages: [{ id: "wamid.CONCURRENT_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const requestId = "00000000-0000-4000-8000-000000000002";

    const [res1, res2] = await Promise.all([
      sendInboxReply({
        conversationId: "conv-open-window",
        type: "text",
        textBody: "Parallel test",
        actorId: "admin-123",
        requestId,
        fetchImpl: mockFetch,
      }),
      sendInboxReply({
        conversationId: "conv-open-window",
        type: "text",
        textBody: "Parallel test",
        actorId: "admin-123",
        requestId,
        fetchImpl: mockFetch,
      }),
    ]);

    // Exactly one call hit Meta
    expect(callCount).toBe(1);

    const successful = [res1, res2].filter((r) => r.ok);
    const inProgress = [res1, res2].filter((r) => !r.ok && r.code === "duplicate_send_in_progress");

    expect(successful).toHaveLength(1);
    expect(inProgress).toHaveLength(1);
  });

  it("permits separate requests with different requestIds", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return new Response(JSON.stringify({ messages: [{ id: `wamid.DIFF_${callCount}` }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const res1 = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "First message",
      actorId: "admin-123",
      requestId: "00000000-0000-4000-8000-000000000003",
      fetchImpl: mockFetch,
    });

    const res2 = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Second message",
      actorId: "admin-123",
      requestId: "00000000-0000-4000-8000-000000000004",
      fetchImpl: mockFetch,
    });

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    expect(callCount).toBe(2);
  });

  it("handles ambiguous timeout by marking status as 'unknown' and never auto-resending", async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error("fetch failed: connection timeout"));

    const res = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Will timeout",
      actorId: "admin-123",
      requestId: "00000000-0000-4000-8000-000000000005",
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("meta_api_ambiguous_timeout");

    // Message row in DB is preserved in 'unknown' state (not falsely marked failed)
    const savedMsg = db.tables.whatsapp_messages.find((m) => m.idempotency_key === "inbox_send:conv-open-window:00000000-0000-4000-8000-000000000005");
    expect(savedMsg).toBeDefined();
    expect(savedMsg?.status).toBe("unknown");
    expect(savedMsg?.message_status).toBe("unknown");
    expect(savedMsg?.error_details).toContain("Ambiguous");
  });

  it("reconciles ambiguous timeout row when Meta webhook delivery event arrives", async () => {
    // 1. Trigger ambiguous timeout
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error("fetch aborted: timeout"));
    const sendRes = await sendInboxReply({
      conversationId: "conv-open-window",
      type: "text",
      textBody: "Pending confirmation",
      actorId: "admin-123",
      requestId: "00000000-0000-4000-8000-000000000006",
      fetchImpl: mockFetch,
    });
    expect(sendRes.ok).toBe(false);

    // 2. Meta webhook delivers status for this phone number
    const webhookOutcome = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.RECONCILED_TIMEOUT_1",
        status: "delivered",
        recipientId: "9876543210",
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
      db,
    );

    expect(webhookOutcome.ok).toBe(true);

    // 3. Verify the unknown row was reconciled to delivered with meta_message_id attached
    const reconciledMsg = db.tables.whatsapp_messages.find((m) => m.meta_message_id === "wamid.RECONCILED_TIMEOUT_1");
    expect(reconciledMsg).toBeDefined();
    expect(reconciledMsg?.status).toBe("delivered");
    expect(reconciledMsg?.message_status).toBe("delivered");
  });

  it("reconciles multiple unknown messages to the same recipient in chronological order", async () => {
    // Message 1 sent earlier
    db.tables.whatsapp_messages.push({
      id: "msg-unknown-1",
      conversation_id: "conv-open-window",
      direction: "outbound",
      recipient: "+919876543210",
      status: "unknown",
      message_status: "unknown",
      message_body: "First timed-out message",
      created_at: new Date(Date.now() - 60000).toISOString(),
    });

    // Message 2 sent later
    db.tables.whatsapp_messages.push({
      id: "msg-unknown-2",
      conversation_id: "conv-open-window",
      direction: "outbound",
      recipient: "+919876543210",
      status: "unknown",
      message_status: "unknown",
      message_body: "Second timed-out message",
      created_at: new Date(Date.now() - 30000).toISOString(),
    });

    // Event 1 arrives for first message
    const resEvent1 = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.ORDERED_FIRST",
        status: "delivered",
        recipientId: "9876543210",
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
      db,
    );
    expect(resEvent1.ok).toBe(true);

    // First message got reconciled
    const msg1 = db.tables.whatsapp_messages.find((m) => m.id === "msg-unknown-1");
    expect(msg1?.meta_message_id).toBe("wamid.ORDERED_FIRST");
    expect(msg1?.status).toBe("delivered");

    // Second message is STILL unknown
    const msg2Before = db.tables.whatsapp_messages.find((m) => m.id === "msg-unknown-2");
    expect(msg2Before?.status).toBe("unknown");

    // Event 2 arrives for second message
    const resEvent2 = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.ORDERED_SECOND",
        status: "delivered",
        recipientId: "9876543210",
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
      db,
    );
    expect(resEvent2.ok).toBe(true);

    // Second message is now reconciled
    const msg2After = db.tables.whatsapp_messages.find((m) => m.id === "msg-unknown-2");
    expect(msg2After?.meta_message_id).toBe("wamid.ORDERED_SECOND");
    expect(msg2After?.status).toBe("delivered");
  });

  it("never matches an unknown message belonging to a different recipient", async () => {
    // Unknown message for Recipient A (9876543210)
    db.tables.whatsapp_messages.push({
      id: "msg-unknown-recip-a",
      conversation_id: "conv-open-window",
      direction: "outbound",
      recipient: "919876543210",
      status: "unknown",
      message_status: "unknown",
      message_body: "Message to Person A",
      created_at: new Date().toISOString(),
    });

    // Event arrives for Recipient B (9123456789)
    const outcome = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.OTHER_RECIPIENT",
        status: "delivered",
        recipientId: "9123456789",
        timestamp: String(Math.floor(Date.now() / 1000)),
      },
      db,
    );

    expect(outcome.ok).toBe(true);
    // Recipient A message was NOT touched
    const msgA = db.tables.whatsapp_messages.find((m) => m.id === "msg-unknown-recip-a");
    expect(msgA?.status).toBe("unknown");
    expect(msgA?.meta_message_id).toBeUndefined();
  });

  it("guarantees duplicate webhook events are strictly idempotent", async () => {
    // Deliver event once
    const event1 = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.DUP_CHECK_1",
        status: "delivered",
        recipientId: "9876543210",
        timestamp: "1790000000",
      },
      db,
    );
    expect(event1.ok).toBe(true);
    expect(event1.deduplicated).toBe(false);

    // Deliver exact same event second time
    const event2 = await recordSharedInboxStatusEvent(
      {
        messageId: "wamid.DUP_CHECK_1",
        status: "delivered",
        recipientId: "9876543210",
        timestamp: "1790000000",
      },
      db,
    );
    expect(event2.ok).toBe(true);
    expect(event2.deduplicated).toBe(true);
    expect(event2.messageUpdated).toBe(false);
  });
});
