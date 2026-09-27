import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { describeOtpPayloadContract, isWhatsAppConfigured, resolveOtpTemplate } from "@/lib/whatsapp/client";

export const dynamic = "force-dynamic";

/**
 * Safe OTP / Meta WhatsApp configuration health check for admins.
 * Reports only whether things are set — never secrets or tokens.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signup = resolveOtpTemplate("customer_signup");
  const login = resolveOtpTemplate("login");
  const reset = resolveOtpTemplate("forgot_pin");

  return NextResponse.json({
    ok: true,
    provider: "meta",
    metaConfigured: isWhatsAppConfigured(),
    phoneNumberIdConfigured: Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim()),
    accessTokenConfigured: Boolean(process.env.META_WHATSAPP_ACCESS_TOKEN?.trim()),
    wabaIdConfigured: Boolean(process.env.META_WHATSAPP_WABA_ID?.trim()),
    appSecretConfigured: Boolean(process.env.META_APP_SECRET?.trim()),
    webhookVerifyTokenConfigured: Boolean(process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()),
    signupTemplate: signup.ok ? { name: signup.templateName, language: signup.language, source: signup.source } : null,
    loginTemplate: login.ok ? { name: login.templateName, language: login.language, source: login.source } : null,
    resetTemplate: reset.ok ? { name: reset.templateName, language: reset.language, source: reset.source } : null,
    otpPayloadContract: describeOtpPayloadContract(),
    otpStore: "supabase",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    note: "API accept ≠ WhatsApp delivered. Live template approval: GET /api/admin/whatsapp/templates.",
  });
}
