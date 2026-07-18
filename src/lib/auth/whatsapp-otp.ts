import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/auth/pin";
import { sendAisensyOtp } from "@/lib/whatsapp/aisensy";

export type OtpPurpose = "customer_signup" | "forgot_pin" | "change_phone" | "security_verification";

export { generateOtp, hashOtp, verifyOtpHash };

/**
 * Deliver customer auth OTP via AiSensy campaign (WHATSAPP_PROVIDER=aisensy).
 * Verification remains server-side in auth_otp_requests.
 */
export async function sendCustomerWhatsappOtp(
  phone: string,
  otp: string,
  purpose: OtpPurpose,
): Promise<{ success: boolean; error?: string; provider?: string }> {
  const result = await sendAisensyOtp({
    phone,
    otp,
    source: `auth:${purpose}`,
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error,
      provider: "aisensy",
    };
  }

  return { success: true, provider: "aisensy" };
}
