import { readFileSync } from "fs";
import { join } from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/automation/delivery-mode", () => ({
  resolveCrmNotificationDeliveryModeDetailed: vi.fn(),
}));
vi.mock("@/lib/automation/events", () => ({
  emitAutomationEvent: vi.fn(),
  markAutomationEventTerminal: vi.fn(),
}));
vi.mock("@/lib/automation/processor", () => ({
  processAutomationEvents: vi.fn(),
}));
vi.mock("@/lib/whatsapp/application-notify", () => ({
  sendApplicationWhatsApp: vi.fn(),
}));

describe("dispatch queue producer ownership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("queue mode: emits event and processes rules; request path does not call direct helper", async () => {
    const { resolveCrmNotificationDeliveryModeDetailed } = await import("@/lib/automation/delivery-mode");
    const { emitAutomationEvent } = await import("@/lib/automation/events");
    const { processAutomationEvents } = await import("@/lib/automation/processor");
    const { sendApplicationWhatsApp } = await import("@/lib/whatsapp/application-notify");
    const { dispatchApplicationNotification } = await import("@/lib/automation/dispatch-notification");

    vi.mocked(resolveCrmNotificationDeliveryModeDetailed).mockReturnValue({
      mode: "queue",
      failClosed: false,
      reason: "exact_queue",
      rawLength: 5,
    });
    vi.mocked(emitAutomationEvent).mockResolvedValue({
      ok: true,
      id: "evt-1",
      deduped: false,
      status: "pending",
    });
    vi.mocked(processAutomationEvents).mockResolvedValue({
      claimed: 1,
      completed: 1,
      retryable: 0,
      failed: 0,
      actionsCompleted: 1,
      actionsSkipped: 0,
      errors: [],
      deliveryMode: "queue",
      configurationStatus: "ready_queue",
    });

    await dispatchApplicationNotification({
      applicationId: "app-1",
      eventType: "application_submitted",
      recipientMobile: "9876543210",
      customerName: "Customer",
      serviceName: "Service",
    });

    expect(emitAutomationEvent).toHaveBeenCalledTimes(1);
    expect(processAutomationEvents).toHaveBeenCalledTimes(1);
    expect(sendApplicationWhatsApp).toHaveBeenCalledTimes(0);
  });

  it("direct mode: sends once and does not process queue rules", async () => {
    const { resolveCrmNotificationDeliveryModeDetailed } = await import("@/lib/automation/delivery-mode");
    const { emitAutomationEvent } = await import("@/lib/automation/events");
    const { processAutomationEvents } = await import("@/lib/automation/processor");
    const { sendApplicationWhatsApp } = await import("@/lib/whatsapp/application-notify");
    const { dispatchApplicationNotification } = await import("@/lib/automation/dispatch-notification");

    vi.mocked(resolveCrmNotificationDeliveryModeDetailed).mockReturnValue({
      mode: "direct",
      failClosed: false,
      reason: "exact_direct",
      rawLength: 6,
    });
    vi.mocked(emitAutomationEvent).mockResolvedValue({
      ok: true,
      id: "evt-2",
      deduped: false,
      status: "completed",
    });
    vi.mocked(sendApplicationWhatsApp).mockResolvedValue({
      ok: true,
      requestId: "req-1",
      messageId: "msg-1",
      deduped: false,
    });

    await dispatchApplicationNotification({
      applicationId: "app-2",
      eventType: "application_submitted",
      recipientMobile: "9876543210",
      customerName: "Customer",
      serviceName: "Service",
    });

    expect(sendApplicationWhatsApp).toHaveBeenCalledTimes(1);
    expect(processAutomationEvents).toHaveBeenCalledTimes(0);
  });

  it("disabled mode: no provider path; audit helper only", async () => {
    const { resolveCrmNotificationDeliveryModeDetailed } = await import("@/lib/automation/delivery-mode");
    const { emitAutomationEvent } = await import("@/lib/automation/events");
    const { processAutomationEvents } = await import("@/lib/automation/processor");
    const { sendApplicationWhatsApp } = await import("@/lib/whatsapp/application-notify");
    const { dispatchApplicationNotification } = await import("@/lib/automation/dispatch-notification");

    vi.mocked(resolveCrmNotificationDeliveryModeDetailed).mockReturnValue({
      mode: "disabled",
      failClosed: true,
      reason: "missing",
      rawLength: 0,
    });
    vi.mocked(emitAutomationEvent).mockResolvedValue({
      ok: true,
      id: "evt-3",
      deduped: false,
      status: "suppressed",
    });
    vi.mocked(sendApplicationWhatsApp).mockResolvedValue({
      ok: false,
      code: "configuration_required",
      error: "disabled",
      requestId: "req-2",
      queued: false,
      messageId: "audit-1",
    });

    await dispatchApplicationNotification({
      applicationId: "app-3",
      eventType: "application_submitted",
      recipientMobile: "9876543210",
      customerName: "Customer",
      serviceName: "Service",
    });

    expect(emitAutomationEvent).toHaveBeenCalledTimes(1);
    expect(sendApplicationWhatsApp).toHaveBeenCalledTimes(1);
    expect(processAutomationEvents).toHaveBeenCalledTimes(0);
  });
});

describe("migrated route static producer guardrails", () => {
  const migratedRoutes = [
    "src/lib/crm/walk-in-application.ts",
    "src/lib/crm/lead-convert.ts",
    "src/lib/whatsapp-automation.ts",
    "src/app/api/admin/applications/[id]/route.ts",
  ] as const;

  it("migrated queue-mode routes do not import direct provider/enqueue helpers", () => {
    for (const file of migratedRoutes) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src).not.toMatch(/createAisensyAdapter/);
      expect(src).not.toMatch(/enqueueCommunication/);
      expect(src).not.toMatch(/sendApplicationWhatsApp/);
      expect(src).toMatch(/dispatchApplicationNotification|emitApplicationStatusChangedFromHistory/);
    }
  });
});

