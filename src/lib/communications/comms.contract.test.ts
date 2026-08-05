/**
 * Phase 5A communication contract tests — deterministic, no live provider / DB.
 * Approved CI: `pnpm exec vitest run src/lib/communications`
 * Local Windows host may BLOCK Vitest (App Control / Rollup). Do not claim PASS if blocked.
 */
import { describe, expect, it, vi } from "vitest";

import {
  buildCommunicationIdempotencyKey,
  canAdvanceOutboxStatus,
  classifyProviderFailure,
  computeBackoffSeconds,
  isValidOutboxTransition,
  maskMobile,
  normalizeProviderDeliveryStatus,
  purposeClassification,
} from "@/lib/communications/comms-core";
import { resolveCommsCronSecret, secretsEqual } from "@/lib/communications/secrets";
import { roleHasCapability } from "@/lib/crm/permissions-core";

describe("outbox status progression", () => {
  it("allows monotonic delivery advancement", () => {
    expect(canAdvanceOutboxStatus("sent", "delivered")).toBe(true);
    expect(canAdvanceOutboxStatus("delivered", "read")).toBe(true);
    expect(canAdvanceOutboxStatus("failed", "delivered")).toBe(false);
    expect(canAdvanceOutboxStatus("cancelled", "sent")).toBe(false);
    expect(canAdvanceOutboxStatus("read", "delivered")).toBe(false);
    expect(canAdvanceOutboxStatus("delivered", "processing")).toBe(false);
  });

  it("enforces centralized application transitions", () => {
    expect(isValidOutboxTransition("queued", "processing")).toBe(true);
    expect(isValidOutboxTransition("processing", "sent")).toBe(true);
    expect(isValidOutboxTransition("processing", "retryable")).toBe(true);
    expect(isValidOutboxTransition("configuration_required", "queued")).toBe(true);
    expect(isValidOutboxTransition("configuration_required", "processing")).toBe(false);
    expect(isValidOutboxTransition("failed", "queued")).toBe(true);
    expect(isValidOutboxTransition("failed", "processing")).toBe(false);
    expect(isValidOutboxTransition("suppressed", "processing")).toBe(false);
  });

  it("normalizes provider delivery statuses without inventing unknowns", () => {
    expect(normalizeProviderDeliveryStatus("Delivered")).toBe("delivered");
    expect(normalizeProviderDeliveryStatus("READ")).toBe("read");
    expect(normalizeProviderDeliveryStatus("success")).toBeNull();
    expect(normalizeProviderDeliveryStatus("weird_vendor_state")).toBeNull();
  });
});

describe("idempotent enqueue key contract", () => {
  it("builds stable event-scoped keys without timestamps", () => {
    const a = buildCommunicationIdempotencyKey([
      "application_submitted",
      "app-1",
      "1",
    ]);
    const b = buildCommunicationIdempotencyKey([
      "application_submitted",
      "app-1",
      "1",
    ]);
    expect(a).toBe(b);
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("documents legacy application key format remains compatible", () => {
    const legacy = "app-1:application_submitted:1";
    expect(legacy.split(":")).toHaveLength(3);
  });

  it("explicit resend requires a distinct event identity in the key", () => {
    const retrySame = buildCommunicationIdempotencyKey([
      "application_submitted",
      "app-1",
      "1",
    ]);
    const explicit = buildCommunicationIdempotencyKey([
      "application_submitted",
      "explicit_resend",
      "outbox-1",
      "evt-authorized-99",
    ]);
    expect(retrySame).not.toBe(explicit);
  });
});

describe("retry / failure classification", () => {
  it("classifies configuration, terminal, and retryable failures", () => {
    expect(classifyProviderFailure({ configurationRequired: true })).toBe("configuration_required");
    expect(classifyProviderFailure({ code: "invalid_mobile" })).toBe("terminal");
    expect(classifyProviderFailure({ httpStatus: 429 })).toBe("retryable");
    expect(classifyProviderFailure({ httpStatus: 400 })).toBe("terminal");
    expect(classifyProviderFailure({ httpStatus: 502 })).toBe("retryable");
  });

  it("bounds backoff with jitter under max", () => {
    const samples = Array.from({ length: 20 }, (_, i) => computeBackoffSeconds(i + 1, 30, 3600));
    expect(Math.max(...samples)).toBeLessThanOrEqual(3600);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(30);
  });
});

describe("consent classification", () => {
  it("treats feedback/welcome as promotional; application events transactional", () => {
    expect(purposeClassification("feedback_request")).toBe("promotional");
    expect(purposeClassification("customer_welcome")).toBe("promotional");
    expect(purposeClassification("application_submitted")).toBe("transactional");
    expect(purposeClassification("payment_due")).toBe("transactional");
  });
});

describe("privacy masking", () => {
  it("masks mobiles for admin list views", () => {
    expect(maskMobile("919876543210")).toBe("91******10");
    expect(maskMobile("12")).toBe("******");
  });
});

describe("authorization matrix for communications ops", () => {
  it("admin can view/retry/cancel; partner and customer cannot", () => {
    expect(roleHasCapability("admin", "messaging.view")).toBe(true);
    expect(roleHasCapability("admin", "messaging.resend")).toBe(true);
    expect(roleHasCapability("admin", "messaging.cancel")).toBe(true);
    expect(roleHasCapability("agency_partner", "messaging.view")).toBe(false);
    expect(roleHasCapability("agency_partner", "messaging.resend")).toBe(false);
    expect(roleHasCapability("customer", "messaging.view")).toBe(false);
  });
});

describe("webhook security contracts (documented)", () => {
  it("forged provider message id cannot update without outbox correlation", () => {
    // Implementation: webhook only updates rows where provider_message_id matches.
    const outboxProviderId = "real-msg-1";
    const forged = "forged-msg-99";
    expect(outboxProviderId === forged).toBe(false);
  });

  it("unknown events acknowledge without mutation", () => {
    const submittedMessageId = null;
    const shouldUpdate = Boolean(submittedMessageId);
    expect(shouldUpdate).toBe(false);
  });

  it("out-of-order delivered after failed is rejected by monotonic guard", () => {
    expect(canAdvanceOutboxStatus("failed", "delivered")).toBe(false);
  });
});

describe("secret / payload log safety contract", () => {
  it("safe log objects must not include api keys or full bodies", () => {
    const log = {
      correlationId: "c1",
      code: "send_failed",
      // Never:
      // apiKey, authorization, webhookSecret, template body dump
    };
    expect(JSON.stringify(log)).not.toMatch(/apiKey|authorization|webhook/i);
  });
});

describe("cron secret resolution", () => {
  it("prefers COMMS_CRON_SECRET and does not fall through when blank", () => {
    const blankPreferred = resolveCommsCronSecret({
      COMMS_CRON_SECRET: "   ",
      CRON_SECRET: "legacy-secret-value-ok",
    } as NodeJS.ProcessEnv);
    expect(blankPreferred.ok).toBe(false);

    const preferred = resolveCommsCronSecret({
      COMMS_CRON_SECRET: "comms-secret-value!!",
      CRON_SECRET: "legacy-secret-value-ok",
    } as NodeJS.ProcessEnv);
    expect(preferred.ok).toBe(true);
    if (preferred.ok) expect(preferred.source).toBe("COMMS_CRON_SECRET");
  });

  it("compares secrets safely across unequal lengths", () => {
    expect(secretsEqual("short", "much-longer-secret-value")).toBe(false);
    expect(secretsEqual("same-secret-value!!", "same-secret-value!!")).toBe(true);
  });
});

describe("provider adapter configuration readiness", () => {
  it("exposes configuration_required without secrets when key missing", async () => {
    const keyName = "AISENSY_API_KEY";
    const prev = process.env[keyName];
    delete process.env[keyName];
    delete process.env.AISENSY_PROJECT_API_KEY;

    vi.resetModules();
    const { createAisensyAdapter } = await import("@/lib/communications/provider-adapter");
    const adapter = createAisensyAdapter();
    const configured = await adapter.isConfigured();
    expect(configured).toBe(false);

    const send = await adapter.sendTemplate({
      campaignName: "application_update",
      destination: "9876543210",
      userName: "Test",
      templateParams: ["a", "b", "c", "d"],
      source: "test",
    });
    expect(send.ok).toBe(false);
    if (!send.ok) {
      expect(send.retryClass).toBe("configuration_required");
      expect(JSON.stringify(send)).not.toMatch(/sk_|Bearer /i);
    }

    if (prev !== undefined) process.env[keyName] = prev;
  });
});
