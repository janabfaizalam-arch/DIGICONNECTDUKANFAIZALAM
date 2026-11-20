import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

let mockUser: { id: string; email?: string } | null = { id: "admin-1", email: "admin@rnos.in" };
let mockRole: string | null = "admin";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => mockUser),
    getCurrentUserRole: vi.fn(async () => mockRole),
  };
});

import { GET as getConversations } from "@/app/api/admin/whatsapp-inbox/conversations/route";
import { GET as getConversation, PATCH as patchConversation } from "@/app/api/admin/whatsapp-inbox/conversations/[id]/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/admin/whatsapp-inbox/conversations/[id]/messages/route";
import { GET as getUnreadCount } from "@/app/api/admin/whatsapp-inbox/unread-count/route";
import { GET as getAssignees } from "@/app/api/admin/whatsapp-inbox/assignees/route";
import { POST as postCustomer } from "@/app/api/admin/whatsapp-inbox/conversations/[id]/customer/route";
import { __resetWhatsAppSendDedupeForTests } from "@/lib/whatsapp/client";

let recentInbound = "";

beforeEach(() => {
  recentInbound = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  __resetWhatsAppSendDedupeForTests();
  process.env.META_WHATSAPP_PHONE_NUMBER_ID = "1303931342795977";
  process.env.META_WHATSAPP_ACCESS_TOKEN = "EAAG_TEST_TOKEN";
  mockUser = { id: "admin-1", email: "admin@rnos.in" };
  mockRole = "admin";
  db = new FakeSupabase({
    whatsapp_conversations: [
      {
        id: "conv-101",
        customer_id: null,
        wa_id: "919876543210",
        customer_name: "Customer One",
        phone_number: "9876543210",
        last_message: "Need quote",
        last_message_at: "2026-11-18T10:00:00Z",
        unread_count: 1,
        status: "open",
        assigned_to: null,
        metadata: {},
        created_at: "2026-11-18T09:00:00Z",
        updated_at: "2026-11-18T10:00:00Z",
      },
    ],
    whatsapp_messages: [
      {
        id: "msg-101",
        conversation_id: "conv-101",
        meta_message_id: "wamid.101",
        direction: "inbound",
        message_type: "text",
        message_body: "Need quote",
        message_status: "received",
        sender_type: "customer",
        // Relative to now: free-form replies are allowed only inside WhatsApp's
        // 24-hour service window, so a fixed date made this test expire.
        created_at: recentInbound,
        timestamp: recentInbound,
      },
    ],
    customers: [],
    profiles: [
      { id: "staff-1", full_name: "Faiz Staff", role: "admin" },
      { id: "staff-2", full_name: "Operations Team", role: "staff" },
    ],
    agency_partners: [],
  });
});

describe("Admin WhatsApp Inbox API routes", () => {
  it("GET /conversations rejects unauthorized non-admin with 403", async () => {
    mockRole = "customer";
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations");
    const res = await getConversations(req);
    expect(res.status).toBe(403);
  });

  it("GET /conversations returns conversations list for admin", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations?filter=all");
    const res = await getConversations(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.conversations).toHaveLength(1);
    expect(data.conversations[0].id).toBe("conv-101");
  });

  it("GET /conversations/[id] returns conversation details", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101");
    const res = await getConversation(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.conversation.id).toBe("conv-101");
  });

  it("PATCH /conversations/[id] updates conversation status and internal notes", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved", internalNote: "Discussed on call" }),
    });
    const res = await patchConversation(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.conversation.status).toBe("resolved");

    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-101");
    expect(conv?.status).toBe("resolved");
    expect((conv?.metadata as { internal_notes?: Array<{ text: string }> })?.internal_notes?.[0].text).toBe(
      "Discussed on call",
    );
  });

  it("GET /conversations/[id]/messages returns message thread", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/messages");
    const res = await getMessages(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].messageBody).toBe("Need quote");
  });

  it("POST /conversations/[id]/messages rejects non-admin with 403", async () => {
    mockRole = "customer";
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "text", textBody: "Test reply" }),
    });
    const res = await postMessage(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(403);
  });

  it("POST /conversations/[id]/messages sends reply successfully", async () => {
    // Mock global fetch for Meta API
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: "wamid.TEST_REPLY_1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    try {
      const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", textBody: "Quote sent on your email." }),
      });
      const res = await postMessage(req, { params: Promise.resolve({ id: "conv-101" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.providerMessageId).toBe("wamid.TEST_REPLY_1");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("GET /unread-count returns 403 when not authenticated as admin", async () => {
    mockUser = null;
    mockRole = null;
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/unread-count");
    const res = await getUnreadCount(req);
    expect(res.status).toBe(403);
  });

  it("GET /unread-count returns metrics for admin", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/unread-count");
    const res = await getUnreadCount(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.unreadConversations).toBe(1);
    expect(data.totalUnreadMessages).toBe(1);
  });

  it("GET /assignees returns active staff assignees for admin", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/assignees");
    const res = await getAssignees(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.assignees)).toBe(true);
    expect(data.assignees.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /conversations/[id]/customer handles create customer profile", async () => {
    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: "Faiz Customer",
        mobile: "9876543210",
        email: "faiz@example.com",
        city: "Kolkata",
      }),
    });
    const res = await postCustomer(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.customer.fullName).toBe("Faiz Customer");

    // Conversation should now have customer_id linked
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-101");
    expect(conv?.customer_id).toBe(data.customer.id);
  });

  it("POST /conversations/[id]/customer handles search action", async () => {
    // Add customer to db
    db.tables.customers.push({
      id: "cust-search-1",
      name: "Searchable Customer",
      mobile: "9988776655",
      is_active: true,
    });

    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "search",
        query: "Searchable",
      }),
    });
    const res = await postCustomer(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.customers.length).toBe(1);
    expect(data.customers[0].id).toBe("cust-search-1");
  });

  it("POST /conversations/[id]/customer handles link action", async () => {
    db.tables.customers.push({
      id: "cust-link-2",
      name: "Linkable Customer",
      mobile: "9900112233",
      is_active: true,
    });

    const req = new Request("http://localhost/api/admin/whatsapp-inbox/conversations/conv-101/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "link",
        customerId: "cust-link-2",
      }),
    });
    const res = await postCustomer(req, { params: Promise.resolve({ id: "conv-101" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.customer.id).toBe("cust-link-2");

    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-101");
    expect(conv?.customer_id).toBe("cust-link-2");
  });
});
