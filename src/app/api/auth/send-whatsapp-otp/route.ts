import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateOTP, hashOTP, sendWhatsappOTP, type WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";
import { indianMobilePattern } from "@/lib/customer-oauth";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // IP-based rate limiting (prevent basic spam)
    const ipLimit = checkRateLimit(`send_otp_ip_${ip}`, 10, 60 * 60 * 1000); // 10 per hour per IP
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);

    const body = await request.json().catch(() => ({}));
    const mobileRaw = String(body.mobile || "").trim();
    const purpose = String(body.purpose || "login") as WhatsappTemplatePurpose;

    const mobile = mobileRaw.replace(/\D/g, "").slice(-10);
    
    if (!indianMobilePattern.test(mobile)) {
      return NextResponse.json({ error: "Invalid Indian mobile number." }, { status: 400 });
    }

    if (!["login", "signup", "password_reset"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });
    }

    // Mobile-based rate limiting (prevent spam to a specific number)
    const mobileLimit = checkRateLimit(`send_otp_mobile_${mobile}`, 3, 10 * 60 * 1000); // 3 per 10 mins per mobile
    if (!mobileLimit.ok) return rateLimitResponse(mobileLimit.retryAfter);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("Supabase admin not initialized");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    // Save to database
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const { error: dbError } = await supabase.from("auth_otps").insert({
      mobile: `91${mobile}`, // Store with 91 prefix
      otp_hash: hashedOTP,
      purpose: purpose,
      expires_at: expiresAt.toISOString(),
      attempts: 0
    });

    if (dbError) {
      console.error("Error saving OTP to database:", dbError);
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
    }

    // Send via AiSensy
    const sendResult = await sendWhatsappOTP(`91${mobile}`, otp, purpose);

    if (!sendResult.success) {
      // We could optionally delete the OTP from DB if sending failed, but it will expire anyway.
      return NextResponse.json({ error: "Failed to send OTP to WhatsApp." }, { status: 500 });
    }

    return NextResponse.json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Send OTP endpoint error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
