import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

import {
  createOrLinkCustomerFromInbox,
  findCustomerByMobile,
  linkExistingCustomerToConversation,
  searchCustomersForInbox,
} from "./inbox-crm";

describe("inbox-crm operations", () => {
  beforeEach(() => {
    db = new FakeSupabase({
      customers: [
        {
          id: "cust-existing-1",
          name: "Riya Sharma",
          full_name: "Riya Sharma",
          mobile: "9876543210",
          email: "riya@example.com",
          city: "Patna",
          address: "Boring Road",
          is_active: true,
          created_at: "2026-11-01T10:00:00Z",
        },
      ],
      whatsapp_conversations: [
        {
          id: "conv-101",
          wa_id: "919876543210",
          phone_number: "9876543210",
          customer_id: null,
          customer_name: "WhatsApp Customer",
          status: "open",
          metadata: {},
        },
        {
          id: "conv-102",
          wa_id: "919123456789",
          phone_number: "9123456789",
          customer_id: null,
          customer_name: "New Person",
          status: "open",
          metadata: {},
        },
      ],
      whatsapp_messages: [
        {
          id: "msg-101",
          conversation_id: "conv-101",
          customer_id: null,
          message_body: "Hi",
        },
        {
          id: "msg-102",
          conversation_id: "conv-102",
          customer_id: null,
          message_body: "Hello",
        },
      ],
    });
  });

  describe("findCustomerByMobile", () => {
    it("finds existing customer by 10-digit mobile", async () => {
      const cust = await findCustomerByMobile("9876543210", db);
      expect(cust).not.toBeNull();
      expect(cust?.id).toBe("cust-existing-1");
      expect(cust?.fullName).toBe("Riya Sharma");
    });

    it("normalizes international prefix and matches customer", async () => {
      const cust = await findCustomerByMobile("+919876543210", db);
      expect(cust).not.toBeNull();
      expect(cust?.id).toBe("cust-existing-1");
    });

    it("returns null when customer does not exist", async () => {
      const cust = await findCustomerByMobile("9999999999", db);
      expect(cust).toBeNull();
    });
  });

  describe("createOrLinkCustomerFromInbox", () => {
    it("creates a new customer and links conversation when customer does not exist", async () => {
      const res = await createOrLinkCustomerFromInbox({
        conversationId: "conv-102",
        name: "Rahul Verma",
        mobile: "9123456789",
        email: "rahul@example.com",
        city: "Gaya",
        supabaseOverride: db,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.createdNew).toBe(true);
      expect(res.customer.fullName).toBe("Rahul Verma");
      expect(res.customer.mobile).toBe("9123456789");

      // Verify conversation updated
      const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-102");
      expect(conv?.customer_id).toBe(res.customer.id);
      expect(conv?.customer_name).toBe("Rahul Verma");

      // Verify messages updated
      const msg = db.tables.whatsapp_messages.find((m) => m.id === "msg-102");
      expect(msg?.customer_id).toBe(res.customer.id);
    });

    it("links existing customer and prevents duplicate records when mobile already exists", async () => {
      const initialCount = db.tables.customers.length;

      const res = await createOrLinkCustomerFromInbox({
        conversationId: "conv-101",
        name: "Riya Sharma Duplicate Attempt",
        mobile: "9876543210", // Mobile already exists in database
        supabaseOverride: db,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.createdNew).toBe(false);
      expect(res.customer.id).toBe("cust-existing-1");

      // Ensures no duplicate row was created in customers table
      expect(db.tables.customers.length).toBe(initialCount);

      // Verify conversation updated to existing customer
      const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-101");
      expect(conv?.customer_id).toBe("cust-existing-1");
    });

    it("rejects invalid mobile number", async () => {
      const res = await createOrLinkCustomerFromInbox({
        conversationId: "conv-101",
        name: "Invalid Number",
        mobile: "123",
        supabaseOverride: db,
      });
      expect(res.ok).toBe(false);
    });
  });

  describe("linkExistingCustomerToConversation", () => {
    it("links conversation and messages to customer by ID", async () => {
      const res = await linkExistingCustomerToConversation({
        conversationId: "conv-101",
        customerId: "cust-existing-1",
        supabaseOverride: db,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.customer.id).toBe("cust-existing-1");

      const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-101");
      expect(conv?.customer_id).toBe("cust-existing-1");

      const msg = db.tables.whatsapp_messages.find((m) => m.id === "msg-101");
      expect(msg?.customer_id).toBe("cust-existing-1");
    });

    it("returns 404 when customer ID does not exist", async () => {
      const res = await linkExistingCustomerToConversation({
        conversationId: "conv-101",
        customerId: "non-existent-id",
        supabaseOverride: db,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(404);
      }
    });
  });

  describe("searchCustomersForInbox", () => {
    it("searches customers by name or mobile substring", async () => {
      const results = await searchCustomersForInbox("Riya", db);
      expect(results).toHaveLength(1);
      expect(results[0].fullName).toBe("Riya Sharma");
    });

    it("returns empty array for queries shorter than 2 characters", async () => {
      const results = await searchCustomersForInbox("R", db);
      expect(results).toHaveLength(0);
    });
  });
});
