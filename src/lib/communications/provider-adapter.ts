import "server-only";

import { classifyProviderFailure } from "@/lib/communications/comms-core";
import { isWhatsAppConfigured, normalizeWhatsAppDestination, sendWhatsAppTemplate } from "@/lib/whatsapp/client";

/** Provider label stored on outbox rows and delivery events. */
export const WHATSAPP_PROVIDER = "meta";

export type ProviderSendInput = {
  /** Meta template name (from the template registry). */
  templateName: string;
  destination: string;
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
 * WhatsApp adapter for the outbox and direct application sends — Meta
 * WhatsApp Cloud API through the central client.
 */
export function createWhatsAppAdapter(): CommunicationProviderAdapter {
  return {
    name: WHATSAPP_PROVIDER,
    async isConfigured() {
      return isWhatsAppConfigured();
    },
    async sendTemplate(input) {
      const dest = normalizeWhatsAppDestination(input.destination);
      if (!dest.ok) {
        return {
          ok: false,
          retryClass: "terminal",
          failureCode: "invalid_mobile",
          failureSummary: "Invalid destination mobile.",
        };
      }

      const result = await sendWhatsAppTemplate({
        templateName: input.templateName,
        destination: dest.destination,
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
          failureSummary: "Meta WhatsApp is not configured.",
          configurationRequired: true,
        };
      }

      if (!result.ok) {
        // A template Meta has not approved (or the 24h window) will not fix itself on retry.
        const terminalCode = ["template_not_approved", "outside_service_window", "meta_auth_failed"].includes(
          String(result.errorCode),
        );
        const retryClass = terminalCode
          ? "terminal"
          : classifyProviderFailure({
              code: result.errorCode,
              httpStatus: result.httpStatus ?? undefined,
              configurationRequired: false,
            });
        return {
          ok: false,
          retryClass,
          failureCode: String(result.errorCode ?? "send_failed"),
          failureSummary: (result.errorMessage || "Provider send failed.").slice(0, 300),
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
  return createWhatsAppAdapter();
}
