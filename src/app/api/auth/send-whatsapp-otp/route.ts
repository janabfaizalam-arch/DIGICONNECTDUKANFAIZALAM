import { NextResponse } from "next/server";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDurable } from "@/lib/rate-limit-durable";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateOTP, hashOTP, sendWhatsappOTP, type WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";
import { indianMobilePattern } from "@/lib/customer-oauth";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    const ipLimit = await checkRateLimitDurable(`send_otp_ip_${ip}`, 10, 60 * 60 * 1000);
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);

    const body = await request.json().catch(() => ({}));
    const mobileRaw = String(body.mobile || "").trim();
    const purpose = String(body.purpose || "login") as WhatsappTemplatePurpose;
    const mobile = mobileRaw.replace(/\D/g, "").slice(-10);
    const destinationMobile = `91${mobile}`;

    console.info("[WhatsApp Auth] AiSensy OTP send requested", {
      mobile,
      destinationMobile,
      purpose,
      ip,
    });

    if (!indianMobilePattern.test(mobile)) {
      console.warn("[WhatsApp Auth] AiSensy OTP send validation failed", { mobile });
      return NextResponse.json({ error: "Invalid Indian mobile number." }, { status: 400 });
    }

    if (!["login", "signup", "password_reset"].includes(purpose)) {
      console.warn("[WhatsApp Auth] AiSensy OTP send purpose rejected", { purpose });
      return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });
    }

    const mobileLimit = await checkRateLimitDurable(`send_otp_mobile_${mobile}`, 3, 10 * 60 * 1000);
    if (!mobileLimit.ok) return rateLimitResponse(mobileLimit.retryAfter);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("[WhatsApp Auth] Supabase admin client not initialized for OTP storage");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.info("[WhatsApp Auth] Persisting hashed AiSensy OTP", {
      mobile: destinationMobile,
      purpose,
      expiresAt: expiresAt.toISOString(),
    });

    const { error: dbError } = await supabase.from("auth_otps").insert({
      mobile: destinationMobile,
      otp_hash: hashedOTP,
      purpose,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    });

    if (dbError) {
      console.error("[WhatsApp Auth] Failed to save AiSensy OTP", {
        mobile: destinationMobile,
        purpose,
        message: dbError.message,
        code: dbError.code,
      });
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
    }

    console.info("[WhatsApp Auth] Sending OTP through AiSensy", {
      mobile: destinationMobile,
      purpose,
    });
    const sendResult = await sendWhatsappOTP(destinationMobile, otp, purpose);

    if (!sendResult.success) {
      console.error("[WhatsApp Auth] AiSensy OTP delivery failed", {
        mobile: destinationMobile,
        purpose,
        error: sendResult.error ?? null,
      });
      return NextResponse.json({ error: "Failed to send OTP to WhatsApp." }, { status: 500 });
    }

    console.info("[WhatsApp Auth] AiSensy OTP delivered", {
      mobile: destinationMobile,
      purpose,
    });

    return NextResponse.json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("[WhatsApp Auth] Send OTP endpoint error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
