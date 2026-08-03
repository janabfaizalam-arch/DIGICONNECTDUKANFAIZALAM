import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/auth/pin";
import {
  AISENSY_USER_FACING_SEND_ERROR,
  sendAisensyOtp,
  type AisensyOtpPurpose,
} from "@/lib/whatsapp/aisensy";

export type OtpPurpose = "customer_signup" | "forgot_pin" | "change_phone" | "security_verification";

export { generateOtp, hashOtp, verifyOtpHash };

export type CustomerOtpSendResult =
  | {
      success: true;
      provider: string;
      campaignName?: string;
      requestId?: string;
    }
  | {
      success: false;
      error: string;
      provider: string;
      campaignName?: string;
      code?: string;
      requestId?: string;
      httpStatus?: number | null;
      /** Redacted provider detail for server logs only — never return to clients. */
      providerDetail?: string;
    };

/**
 * Deliver customer auth OTP via the AiSensy campaign selected for `purpose`.
 * Verification remains server-side in auth_otp_requests.
 */
export async function sendCustomerWhatsappOtp(
  phone: string,
  otp: string,
  purpose: OtpPurpose | AisensyOtpPurpose,
): Promise<CustomerOtpSendResult> {
  const result = await sendAisensyOtp({
    phone,
    otp,
    purpose,
    source: `auth:${purpose}`,
  });

  if (!result.ok) {
    console.error("[whatsapp-otp] send_failed", {
      purpose,
      provider: "aisensy",
      code: result.code,
      campaign: result.campaignName,
      requestId: result.requestId,
      httpStatus: result.httpStatus,
      providerDetail: result.providerDetail,
    });
    return {
      success: false,
      error: result.code === "invalid_phone" ? result.error : AISENSY_USER_FACING_SEND_ERROR,
      provider: "aisensy",
      campaignName: result.campaignName,
      code: result.code,
      requestId: result.requestId,
      httpStatus: result.httpStatus,
      providerDetail: result.providerDetail,
    };
  }

  console.info("[whatsapp-otp] send_accepted", {
    purpose,
    provider: "aisensy",
    campaign: result.campaignName,
    requestId: result.requestId,
  });

  return {
    success: true,
    provider: "aisensy",
    campaignName: result.campaignName,
    requestId: result.requestId,
  };
}
