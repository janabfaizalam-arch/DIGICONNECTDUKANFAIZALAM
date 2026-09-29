import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeSupabase } from "@/test/fake-supabase";

let db: FakeSupabase;
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => db }));
vi.mock("@/lib/crmSync", () => ({ scheduleCrmSync: vi.fn() }));
const dispatch = vi.fn();
vi.mock("@/lib/automation/dispatch-notification", () => ({
  dispatchApplicationNotification: (...args: unknown[]) => dispatch(...args),
}));

import { triggerWhatsAppNotification } from "@/lib/whatsapp-automation";

const APP = "11111111-2222-4333-8444-555555555555";

beforeEach(() => {
  db = new FakeSupabase({
    applications: [
      { id: APP, status: "in_process", service_name: "PAN Card", amount: 199, customer_mobile: "9876543210", customer_name: "Riya" },
    ],
    whatsapp_messages: [],
    system_events: [],
  });
  dispatch.mockReset();
  dispatch.mockResolvedValue({ ok: true, requestId: "r", messageId: "m" });
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("one message per paid purchase", () => {
  it("skips submitted and payment-received once the invoice message went out", async () => {
    db.tables.whatsapp_messages.push({ application_id: APP, event_type: "invoice_generated", status: "sent" });
    expect(await triggerWhatsAppNotification("application_created", APP)).toMatchObject({ skipped: "covered_by_invoice" });
    expect(await triggerWhatsAppNotification("payment_success", APP)).toMatchObject({ skipped: "covered_by_invoice" });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("still sends them when the invoice message failed or was never sent", async () => {
    db.tables.whatsapp_messages.push({ application_id: APP, event_type: "invoice_generated", status: "failed" });
    await triggerWhatsAppNotification("payment_success", APP);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("never skips status updates", async () => {
    db.tables.whatsapp_messages.push({ application_id: APP, event_type: "invoice_generated", status: "sent" });
    await triggerWhatsAppNotification("completed", APP);
    expect(dispatch).toHaveBeenCalledOnce();
  });
});
