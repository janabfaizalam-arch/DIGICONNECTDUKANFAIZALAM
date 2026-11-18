import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));

import {
  FLOW_CUSTOMER_SUPPORT_ID,
  FLOW_CUSTOMER_SUPPORT_NAME,
  parseCustomerSupportFlowResponse,
  syncFlowResponseToCrm,
} from "./inbox-flow";

describe("parseCustomerSupportFlowResponse", () => {
  it("parses valid Flow response JSON with standard fields", () => {
    const rawJson = JSON.stringify({
      name: "Riya Sharma",
      service: "PAN Card",
      issue: "Name correction in existing PAN card",
      city: "Patna",
      pincode: "800001",
      email: "riya@example.com",
      urgency: "high",
    });

    const parsed = parseCustomerSupportFlowResponse(rawJson, "Fallback Name");
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.flowId).toBe(FLOW_CUSTOMER_SUPPORT_ID);
    expect(parsed.flowName).toBe(FLOW_CUSTOMER_SUPPORT_NAME);
    expect(parsed.name).toBe("Riya Sharma");
    expect(parsed.service).toBe("PAN Card");
    expect(parsed.issue).toBe("Name correction in existing PAN card");
    expect(parsed.city).toBe("Patna");
    expect(parsed.pincode).toBe("800001");
    expect(parsed.email).toBe("riya@example.com");
    expect(parsed.urgency).toBe("high");
    expect(parsed.summary).toContain("Service: PAN Card");
    expect(parsed.summary).toContain("City: Patna");
  });

  it("handles alternative field names gracefully", () => {
    const rawJson = JSON.stringify({
      customer_name: "Amit Kumar",
      department: "Income Certificate",
      query: "Need urgently for scholarship",
      details: "Application submitted yesterday",
    });

    const parsed = parseCustomerSupportFlowResponse(rawJson);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.name).toBe("Amit Kumar");
    expect(parsed.service).toBe("Income Certificate");
    expect(parsed.issue).toBe("Need urgently for scholarship");
  });

  it("falls back to profile name when name is missing in Flow JSON", () => {
    const rawJson = JSON.stringify({
      service: "Aadhaar Print",
      message: "PVC card required",
    });

    const parsed = parseCustomerSupportFlowResponse(rawJson, "Profile Name From WhatsApp");
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.name).toBe("Profile Name From WhatsApp");
    expect(parsed.service).toBe("Aadhaar Print");
  });

  it("returns null for invalid JSON or empty input", () => {
    expect(parseCustomerSupportFlowResponse(null)).toBeNull();
    expect(parseCustomerSupportFlowResponse("")).toBeNull();
    expect(parseCustomerSupportFlowResponse("not-json-string")).toBeNull();
  });
});

describe("syncFlowResponseToCrm", () => {
  beforeEach(() => {
    db = new FakeSupabase({
      leads: [],
      lead_activities: [],
      lead_ingestion_keys: [],
      admin_notifications: [],
      whatsapp_conversations: [
        {
          id: "conv-flow-1",
          wa_id: "919876543210",
          phone_number: "9876543210",
          customer_name: "WhatsApp Customer",
          status: "open",
          metadata: {},
        },
      ],
    });
  });

  it("ingests lead, creates timeline activity, and notifies admin", async () => {
    const parsedFlow = parseCustomerSupportFlowResponse(
      JSON.stringify({
        name: "Faiz Alam",
        service: "PVC Print",
        issue: "Need 2 PVC cards printed",
        city: "Kolkata",
      }),
    )!;

    const res = await syncFlowResponseToCrm({
      flow: parsedFlow,
      mobile: "919876543210",
      messageId: "wamid.FLOW_MSG_001",
      conversationId: "conv-flow-1",
      supabaseOverride: db,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.isDuplicate).toBe(false);
    expect(res.leadId).toBeDefined();

    // Verify lead created in leads
    const lead = db.tables.leads.find((l) => l.id === res.leadId);
    expect(lead).toBeDefined();
    expect(lead?.name).toBe("Faiz Alam");
    expect(lead?.mobile_normalized).toBe("9876543210");
    expect(lead?.source).toBe("whatsapp");

    // Verify timeline activity in lead_activities
    const activity = db.tables.lead_activities.find(
      (a) => a.lead_id === res.leadId && a.activity_type === "whatsapp_inbound",
    );
    expect(activity).toBeDefined();
    expect(activity?.activity_type).toBe("whatsapp_inbound");
    expect(activity?.body).toContain("DigiConnect Customer Support");

    // Verify admin notification generated
    const notification = db.tables.admin_notifications.find((n) => n.related_id === res.leadId);
    expect(notification).toBeDefined();
    expect(notification?.type).toBe("new_lead");

    // Verify conversation updated with crm_lead_id and customer name
    const conv = db.tables.whatsapp_conversations.find((c) => c.id === "conv-flow-1");
    expect(conv?.customer_name).toBe("Faiz Alam");
    const meta = conv?.metadata as Record<string, unknown>;
    expect(meta?.crm_lead_id).toBe(res.leadId);
  });

  it("prevents duplicate lead creation on redelivered Flow webhook", async () => {
    const parsedFlow = parseCustomerSupportFlowResponse(
      JSON.stringify({
        name: "Faiz Alam",
        service: "PVC Print",
        issue: "Need 2 PVC cards printed",
      }),
    )!;

    // First delivery
    const res1 = await syncFlowResponseToCrm({
      flow: parsedFlow,
      mobile: "919876543210",
      messageId: "wamid.FLOW_MSG_DUPE",
      conversationId: "conv-flow-1",
      supabaseOverride: db,
    });
    expect(res1.ok).toBe(true);
    expect(db.tables.leads).toHaveLength(1);

    // Redelivery with same messageId
    const res2 = await syncFlowResponseToCrm({
      flow: parsedFlow,
      mobile: "919876543210",
      messageId: "wamid.FLOW_MSG_DUPE",
      conversationId: "conv-flow-1",
      supabaseOverride: db,
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.isDuplicate).toBe(true);
    }
    // Ensures no second lead was created
    expect(db.tables.leads).toHaveLength(1);
  });
});
