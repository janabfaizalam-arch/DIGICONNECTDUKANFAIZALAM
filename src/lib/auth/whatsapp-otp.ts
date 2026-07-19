import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/auth/pin";
import {
  AISENSY_USER_FACING_SEND_ERROR,
  sendAisensyOtp,
  type AisensyOtpPurpose,
} from "@/lib/whatsapp/aisensy";

export type OtpPurpose = "customer_signup" | "forgot_pin" | "change_phone" | "security_verification";

export { generateOtp, hashOtp, verifyOtpHash };

/**
 * Deliver customer auth OTP via the AiSensy campaign selected for `purpose`.
 * Verification remains server-side in auth_otp_requests.
 */
export async function sendCustomerWhatsappOtp(
  phone: string,
  otp: string,
  purpose: OtpPurpose | AisensyOtpPurpose,
): Promise<{ success: boolean; error?: string; provider?: string; campaignName?: string }> {
  const result = await sendAisensyOtp({
    phone,
    otp,
    purpose,
    source: `auth:${purpose}`,
  });

  if (!result.ok) {
    return {
      success: false,
      error: AISENSY_USER_FACING_SEND_ERROR,
      provider: "aisensy",
      campaignName: result.campaignName,
    };
  }

  return { success: true, provider: "aisensy", campaignName: result.campaignName };
}
