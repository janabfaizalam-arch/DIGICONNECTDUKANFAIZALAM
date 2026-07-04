import crypto from "crypto";

export type WhatsappTemplatePurpose = "login" | "signup" | "password_reset";

export function generateOTP(): string {
  // Generate a cryptographically secure 6-digit OTP
  const min = 100000;
  const max = 999999;
  const randomValue = crypto.randomInt(min, max + 1);
  return randomValue.toString();
}

export function hashOTP(otp: string): string {
  // Hash the OTP using SHA-256 for secure storage in database
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOTPHash(otp: string, hashedOTP: string): boolean {
  return hashOTP(otp) === hashedOTP;
}

export async function sendWhatsappOTP(mobile: string, otp: string, purpose: WhatsappTemplatePurpose): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.AISENSY_PROJECT_API_KEY;

    if (!apiKey) {
      console.error("AiSensy credentials missing in environment variables.");
      return { success: false, error: "AiSensy configuration missing." };
    }

    let campaignName = "";
    switch (purpose) {
      case "login":
        campaignName = process.env.AISENSY_CAMPAIGN_NAME_LOGIN || "login_otp";
        break;
      case "signup":
        campaignName = process.env.AISENSY_CAMPAIGN_NAME_SIGNUP || "signup_otp";
        break;
      case "password_reset":
        campaignName = process.env.AISENSY_CAMPAIGN_NAME_RESET || "password_reset";
        break;
      default:
        campaignName = "login_otp";
    }

    const payload = {
      apiKey: apiKey,
      campaignName: campaignName,
      destination: mobile,
      userName: "User", // generic since we might not know their name
      templateParams: [otp], // The approved templates expect a single parameter for the OTP
      source: "web-auth",
      buttons: [
        {
          type: "button",
          sub_type: "url",
          index: 0,
          parameters: [
            {
              type: "text",
              text: otp
            }
          ]
        }
      ]
    };

    const url = "https://backend.aisensy.com/campaign/t1/api/v2";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseBodyText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseBodyText);
    } catch {
      responseBody = responseBodyText;
    }

    // Mask secrets for logging
    const maskedPayload = { ...payload, apiKey: "***MASKED***" };
    console.log(`[AiSensy] POST ${url} - Status: ${response.status}`);
    console.log(`[AiSensy] Request Payload:`, JSON.stringify(maskedPayload));
    console.log(`[AiSensy] Response Body:`, typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody));

    if (!response.ok) {
      return { success: false, error: `AiSensy API error: ${response.status} - ${typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp OTP:", error);
    return { success: false, error: error instanceof Error ? error.message : "Internal error while sending OTP." };
  }
}
