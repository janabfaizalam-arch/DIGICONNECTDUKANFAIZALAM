import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  describeOtpPayloadContract,
  loadAisensyConfig,
  resolveOtpCampaign,
} from "@/lib/whatsapp/aisensy";

export const dynamic = "force-dynamic";

function maskCampaign(name: string): string {
  const value = name.trim();
  if (value.length <= 6) return `${value.slice(0, 1)}***`;
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

/**
 * Safe OTP / AiSensy configuration health check for admins.
 * Never returns secrets or full campaign-sensitive payloads.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = loadAisensyConfig();
  const signup = resolveOtpCampaign("customer_signup");
  const login = resolveOtpCampaign("login");
  const reset = resolveOtpCampaign("forgot_pin");
  const payloadContract = describeOtpPayloadContract();

  const baseUrlConfigured = Boolean(
    process.env.AISENSY_BASE_URL?.trim() || process.env.AISENSY_API_URL?.trim(),
  );
  const apiKeyConfigured = Boolean(
    process.env.AISENSY_API_KEY?.trim() || process.env.AISENSY_PROJECT_API_KEY?.trim(),
  );

  return NextResponse.json({
    ok: true,
    aisensyBaseUrlConfigured: baseUrlConfigured,
    aisensyApiKeyConfigured: apiKeyConfigured,
    aisensyConfigLoadOk: config.ok,
    signupCampaignConfigured: signup.ok,
    signupCampaignSource: signup.ok ? signup.source : null,
    signupCampaignMasked: signup.ok ? maskCampaign(signup.campaignName) : null,
    loginCampaignConfigured: login.ok,
    resetCampaignConfigured: reset.ok,
    otpPayloadContract: payloadContract,
    messageStatusUrlConfigured: Boolean(process.env.AISENSY_MESSAGE_STATUS_URL?.trim()),
    webhookSecretConfigured: Boolean(process.env.AISENSY_WEBHOOK_SECRET?.trim()),
    otpStore: "supabase",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    note:
      "API accept (success=true) ≠ WhatsApp Delivered. Match Live campaign Test Campaign cURL before changing AISENSY_OTP_* envs.",
  });
}
