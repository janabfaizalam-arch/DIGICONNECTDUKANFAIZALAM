import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

import {
  getInboxConversation,
  getInboxMessages,
  getInboxUnreadCount,
  listInboxConversations,
  updateInboxConversation,
} from "@/lib/whatsapp/inbox-ops";

beforeEach(() => {
  db = new FakeSupabase({
    whatsapp_conversations: [
      {
        id: "conv-1",
        customer_id: "cust-1",
        wa_id: "919876543210",
        customer_name: "Riya Sharma",
        phone_number: "9876543210",
        last_message: "Need help with PAN card",
        last_message_at: "2026-11-18T10:00:00Z",
        unread_count: 2,
        status: "open",
        assigned_to: "staff-1",
        created_at: "2026-11-18T09:00:00Z",
        updated_at: "2026-11-18T10:00:00Z",
      },
      {
        id: "conv-2",
        customer_id: null,
        wa_id: "919123456789",
        customer_name: "Amit Patel",
        phone_number: "9123456789",
        last_message: "Invoice please",
        last_message_at: "2026-11-18T11:00:00Z",
        unread_count: 0,
        status: "pending",
        assigned_to: null,
        created_at: "2026-11-18T08:00:00Z",
        updated_at: "2026-11-18T11:00:00Z",
      },
      {
        id: "conv-3",
        customer_id: null,
        wa_id: "919000000000",
        customer_name: "Resolved Contact",
        phone_number: "9000000000",
        last_message: "Thank you",
        last_message_at: "2026-11-17T12:00:00Z",
        unread_count: 0,
        status: "resolved",
        assigned_to: null,
        created_at: "2026-11-17T11:00:00Z",
        updated_at: "2026-11-17T12:00:00Z",
      },
      {
        id: "conv-4",
        customer_id: null,
        wa_id: "919111111111",
        customer_name: "Archived Thread",
        phone_number: "9111111111",
        last_message: "Old query",
        last_message_at: "2026-10-01T10:00:00Z",
        unread_count: 0,
        status: "archived",
        assigned_to: null,
        created_at: "2026-10-01T09:00:00Z",
        updated_at: "2026-10-01T10:00:00Z",
      },
    ],
    customers: [
      {
        id: "cust-1",
        full_name: "Riya Sharma",
        mobile: "9876543210",
        email: "riya@example.com",
        city: "Mumbai",
        address: "Andheri East",
        notes: "VIP customer",
      },
    ],
    whatsapp_messages: [
      {
        id: "msg-1",
        conversation_id: "conv-1",
        meta_message_id: "wamid.1",
        direction: "inbound",
        message_type: "text",
        message_body: "Hello",
        message_status: "received",
        sender_type: "customer",
        created_at: "2026-11-18T09:00:00Z",
        timestamp: "2026-11-18T09:00:00Z",
      },
      {
        id: "msg-2",
        conversation_id: "conv-1",
        meta_message_id: "wamid.2",
        direction: "inbound",
        message_type: "text",
        message_body: "Need help with PAN card",
        message_status: "received",
        sender_type: "customer",
        created_at: "2026-11-18T10:00:00Z",
        timestamp: "2026-11-18T10:00:00Z",
      },
    ],
  });
});

describe("listInboxConversations", () => {
  it("lists non-archived conversations by default", async () => {
    const res = await listInboxConversations({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.conversations).toHaveLength(3);
    expect(res.conversations.map((c) => c.id)).not.toContain("conv-4");
  });

  it("filters by unread", async () => {
    const res = await listInboxConversations({ filter: "unread" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.conversations).toHaveLength(1);
    expect(res.conversations[0].id).toBe("conv-1");
  });

  it("filters by status (open, pending, resolved)", async () => {
    const openRes = await listInboxConversations({ filter: "open" });
    expect(openRes.ok && openRes.conversations[0].id).toBe("conv-1");

    const pendingRes = await listInboxConversations({ filter: "pending" });
    expect(pendingRes.ok && pendingRes.conversations[0].id).toBe("conv-2");

    const resolvedRes = await listInboxConversations({ filter: "resolved" });
    expect(resolvedRes.ok && resolvedRes.conversations[0].id).toBe("conv-3");
  });

  it("filters by assigned to me", async () => {
    const res = await listInboxConversations({ filter: "mine", userId: "staff-1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.conversations).toHaveLength(1);
    expect(res.conversations[0].id).toBe("conv-1");
  });

  it("searches by query q matching customer name or phone", async () => {
    const res = await listInboxConversations({ q: "Amit" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.conversations).toHaveLength(1);
    expect(res.conversations[0].customerName).toBe("Amit Patel");
  });
});

describe("getInboxConversation", () => {
  it("returns conversation and joins customer details if linked", async () => {
    const res = await getInboxConversation("conv-1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.conversation.id).toBe("conv-1");
    expect(res.conversation.customer).toMatchObject({
      id: "cust-1",
      fullName: "Riya Sharma",
      email: "riya@example.com",
    });
  });

  it("returns 404 for unknown conversation", async () => {
    const res = await getInboxConversation("conv-unknown");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(404);
  });
});

describe("getInboxMessages", () => {
  it("returns messages for conversation and resets unread_count to 0", async () => {
    const res = await getInboxMessages("conv-1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.messages).toHaveLength(2);
    expect(res.messages[1].messageBody).toBe("Need help with PAN card");

    // Verify unread_count was marked read (0)
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-1");
    expect(conv?.unread_count).toBe(0);
  });
});

describe("updateInboxConversation", () => {
  it("updates conversation status", async () => {
    const res = await updateInboxConversation("conv-1", { status: "resolved" });
    expect(res.ok).toBe(true);
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-1");
    expect(conv?.status).toBe("resolved");
  });

  it("updates conversation assignment", async () => {
    const res = await updateInboxConversation("conv-2", { assignedTo: "staff-2" });
    expect(res.ok).toBe(true);
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-2");
    expect(conv?.assigned_to).toBe("staff-2");
  });

  it("appends internal notes to metadata", async () => {
    const res = await updateInboxConversation(
      "conv-1",
      { internalNote: "Called customer, will submit docs by evening" },
      "staff-1",
    );
    expect(res.ok).toBe(true);
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-1");
    const meta = conv?.metadata as { internal_notes?: Array<{ text: string }> };
    expect(meta?.internal_notes).toHaveLength(1);
    expect(meta?.internal_notes?.[0].text).toBe("Called customer, will submit docs by evening");
  });
});

describe("getInboxUnreadCount", () => {
  it("computes unread conversation count and total unread messages correctly", async () => {
    const res = await getInboxUnreadCount();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // conv-1 has unread_count: 2; conv-2, 3, 4 have unread_count: 0
    expect(res.unreadConversations).toBe(1);
    expect(res.totalUnreadMessages).toBe(2);
  });

  it("ignores archived conversations even if unread_count > 0", async () => {
    // Add an archived conversation with unread_count > 0
    db.tables.whatsapp_conversations.push({
      id: "conv-archived-unread",
      customer_id: null,
      wa_id: "919999999999",
      phone_number: "9999999999",
      unread_count: 5,
      status: "archived",
      created_at: "2026-11-18T00:00:00Z",
    });

    const res = await getInboxUnreadCount();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.unreadConversations).toBe(1);
    expect(res.totalUnreadMessages).toBe(2);
  });
});

