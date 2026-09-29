import crypto from "crypto";

import {
  WHATSAPP_USER_FACING_SEND_ERROR,
  sendWhatsAppOtp,
  type WhatsAppOtpPurpose,
} from "@/lib/whatsapp/client";

/** Legacy purpose labels used by older customer-auth routes. */
export type WhatsappTemplatePurpose = "login" | "signup" | "password_reset";

function mapLegacyPurpose(purpose: WhatsappTemplatePurpose): WhatsAppOtpPurpose {
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
 * Delivery via Meta WhatsApp (Authentication template for the purpose); verification remains server-side.
 */
export async function sendWhatsappOTP(
  mobile: string,
  otp: string,
  purpose: WhatsappTemplatePurpose,
): Promise<{ success: boolean; error?: string; code?: string; requestId?: string }> {
  const mapped = mapLegacyPurpose(purpose);
  const result = await sendWhatsAppOtp({
    phone: mobile,
    otp,
    purpose: mapped,
    source: `legacy-whatsapp-auth:${purpose}`,
  });
  if (!result.ok) {
    console.error("[whatsapp-auth] legacy_send_failed", {
      purpose,
      mapped,
      code: result.code,
      template: result.templateName,
      requestId: result.requestId,
      providerDetail: result.providerDetail,
    });
    return {
      success: false,
      error: WHATSAPP_USER_FACING_SEND_ERROR,
      code: result.code,
      requestId: result.requestId,
    };
  }
  return { success: true, requestId: result.requestId };
}
