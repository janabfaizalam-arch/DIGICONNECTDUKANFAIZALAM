import "server-only";

import { sendAisensyCampaign, normalizeAisensyDestination, loadAisensyConfig } from "@/lib/whatsapp/aisensy";
import { classifyProviderFailure } from "@/lib/communications/comms-core";

export type ProviderSendInput = {
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source: string;
  media?: { url: string; filename?: string };
  correlationId?: string;
};

export type ProviderSendResult =
  | {
      ok: true;
      providerMessageId: string | null;
      configurationRequired?: false;
    }
  | {
      ok: false;
      retryClass: "retryable" | "terminal" | "configuration_required";
      failureCode: string;
      failureSummary: string;
      configurationRequired?: boolean;
    };

export type CommunicationProviderAdapter = {
  name: string;
  isConfigured(): Promise<boolean>;
  sendTemplate(input: ProviderSendInput): Promise<ProviderSendResult>;
};

/**
 * Hardened AiSensy adapter — wraps existing campaign client.
 * Does not invent webhook signatures; delivery webhooks stay shared-secret based.
 */
export function createAisensyAdapter(): CommunicationProviderAdapter {
  return {
    name: "aisensy",
    async isConfigured() {
      const cfg = loadAisensyConfig();
      return Boolean(cfg.ok);
    },
    async sendTemplate(input) {
      const dest = normalizeAisensyDestination(input.destination);
      if (!dest.ok) {
        return {
          ok: false,
          retryClass: "terminal",
          failureCode: "invalid_mobile",
          failureSummary: "Invalid destination mobile.",
        };
      }

      const result = await sendAisensyCampaign({
        campaignName: input.campaignName,
        destination: dest.destination,
        userName: input.userName || "Customer",
        templateParams: input.templateParams,
        source: input.source,
        media: input.media
          ? { url: input.media.url, filename: input.media.filename || "document.pdf" }
          : undefined,
        dedupe: false,
      });

      if (result.configuration_required) {
        return {
          ok: false,
          retryClass: "configuration_required",
          failureCode: "configuration_required",
          failureSummary: "AiSensy is not configured.",
          configurationRequired: true,
        };
      }

      if (!result.ok) {
        const retryClass = classifyProviderFailure({
          code: result.errorCode,
          httpStatus: result.httpStatus ?? undefined,
          configurationRequired: false,
        });
        return {
          ok: false,
          retryClass,
          failureCode: String(result.errorCode ?? "send_failed"),
          failureSummary: "Provider send failed.",
        };
      }

      return {
        ok: true,
        providerMessageId: result.providerMessageId ?? null,
      };
    },
  };
}

export function getDefaultCommunicationProvider(): CommunicationProviderAdapter {
  return createAisensyAdapter();
}
