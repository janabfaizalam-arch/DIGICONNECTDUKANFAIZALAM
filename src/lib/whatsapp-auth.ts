import crypto from "crypto";

import { sendAisensyOtp } from "@/lib/whatsapp/aisensy";

/** Legacy purpose labels — delivery uses AISENSY_OTP_CAMPAIGN_NAME. */
export type WhatsappTemplatePurpose = "login" | "signup" | "password_reset";

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
 * Legacy adapter for older WhatsApp OTP routes.
 * Delivery only via AiSensy; verification remains server-side.
 */
export async function sendWhatsappOTP(
  mobile: string,
  otp: string,
  purpose: WhatsappTemplatePurpose,
): Promise<{ success: boolean; error?: string }> {
  void purpose;
  const result = await sendAisensyOtp({
    phone: mobile,
    otp,
    source: "legacy-whatsapp-auth",
  });
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  return { success: true };
}
