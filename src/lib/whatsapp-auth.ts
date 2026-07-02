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
    const baseUrl = process.env.AISENSY_BASE_URL;

    if (!apiKey || !baseUrl) {
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
      source: "web-auth"
    };

    // Remove trailing slash from base url if present
    const url = `${baseUrl.replace(/\/$/, "")}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AiSensy API error:", response.status, errorText);
      return { success: false, error: "Failed to send OTP via WhatsApp." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp OTP:", error);
    return { success: false, error: "Internal error while sending OTP." };
  }
}
