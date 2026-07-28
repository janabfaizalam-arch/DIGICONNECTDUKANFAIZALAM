/**
 * Public alias for the central AiSensy campaign client.
 * Implementation lives in `aisensy.ts` (also powers OTP) — do not duplicate fetch logic here.
 */
export {
  sendAisensyCampaign,
  loadAisensyConfig,
  normalizeAisensyDestination,
  isAisensySuccessResponse,
  redactSecrets,
  getWhatsappProvider,
  __resetAisensySendDedupeForTests,
} from "@/lib/whatsapp/aisensy";

export type { SendAisensyCampaignInput, SendAisensyCampaignResult } from "@/lib/whatsapp/types";
