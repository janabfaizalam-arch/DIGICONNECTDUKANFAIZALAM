import crypto from "crypto";

import {
  AISENSY_USER_FACING_SEND_ERROR,
  sendAisensyOtp,
  type AisensyOtpPurpose,
} from "@/lib/whatsapp/aisensy";

/** Legacy purpose labels used by older customer-auth routes. */
export type WhatsappTemplatePurpose = "login" | "signup" | "password_reset";

function mapLegacyPurpose(purpose: WhatsappTemplatePurpose): AisensyOtpPurpose {
  if (purpose === "signup") return "customer_signup";
  if (purpose === "login") return "login";
  return "password_reset";
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOTPHash(otp: string, hashedOTP: string): boolean {
  return hashOTP(otp) === hashedOTP;
}

/**
 * Legacy adapter for older customer-auth routes.
 * Delivery only via AiSensy; verification remains server-side.
 * Campaign is selected from purpose via getCampaignName().
 */
export async function sendWhatsappOTP(
  mobile: string,
  otp: string,
  purpose: WhatsappTemplatePurpose,
): Promise<{ success: boolean; error?: string }> {
  const mapped = mapLegacyPurpose(purpose);
  const result = await sendAisensyOtp({
    phone: mobile,
    otp,
    purpose: mapped,
    source: `legacy-whatsapp-auth:${purpose}`,
  });
  if (!result.ok) {
    return { success: false, error: AISENSY_USER_FACING_SEND_ERROR };
  }
  return { success: true };
}
