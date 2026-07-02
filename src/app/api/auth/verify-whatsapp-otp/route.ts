import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { verifyOTPHash, type WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";
import { indianMobilePattern } from "@/lib/customer-oauth";
import { findAuthUserByEmailOrMobile, completeCustomerAccount } from "@/lib/customer-identity";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // IP-based rate limiting
    const ipLimit = checkRateLimit(`verify_otp_ip_${ip}`, 20, 60 * 60 * 1000); // 20 per hour
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);

    const body = await request.json().catch(() => ({}));
    const mobileRaw = String(body.mobile || "").trim();
    const otp = String(body.otp || "").trim();
    const purpose = String(body.purpose || "login") as WhatsappTemplatePurpose;

    const mobile = mobileRaw.replace(/\D/g, "").slice(0, 10);
    
    if (!indianMobilePattern.test(mobile)) {
      return NextResponse.json({ error: "Invalid Indian mobile number." }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "Invalid OTP format." }, { status: 400 });
    }

    const mobileLimit = checkRateLimit(`verify_otp_mobile_${mobile}`, 10, 10 * 60 * 1000); 
    if (!mobileLimit.ok) return rateLimitResponse(mobileLimit.retryAfter);

    const supabaseAdmin = getSupabaseAdmin();
    const supabaseRoute = await getSupabaseRouteHandlerClient();

    if (!supabaseAdmin || !supabaseRoute) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // 1. Fetch the latest OTP for this mobile and purpose
    const { data: otps, error: fetchError } = await supabaseAdmin
      .from("auth_otps")
      .select("*")
      .eq("mobile", `91${mobile}`)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !otps || otps.length === 0) {
      return NextResponse.json({ error: "No OTP found for this number. Please request a new one." }, { status: 400 });
    }

    const otpRecord = otps[0];

    // 2. Check Expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // 3. Check Attempts
    if (otpRecord.attempts >= 3) {
      return NextResponse.json({ error: "Too many failed attempts. Please request a new OTP." }, { status: 400 });
    }

    // 4. Verify Hash
    const isValid = verifyOTPHash(otp, otpRecord.otp_hash);

    if (!isValid) {
      // Increment attempts
      await supabaseAdmin
        .from("auth_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });
    }

    // 5. OTP is valid, delete it
    await supabaseAdmin.from("auth_otps").delete().eq("id", otpRecord.id);

    // 6. Handle User Account (Login / Signup)
    let userEmail = `whatsapp_${mobile}@rnos.in`; // fallback email
    let isNewUser = false;
    let userId: string | null = null;
    
    // Check if user exists by mobile
    const existingUser = await findAuthUserByEmailOrMobile(supabaseAdmin, "", mobile);
    
    // Create random secure password for session generation
    const temporaryPassword = crypto.randomBytes(32).toString("hex") + "A1!"; 
    
    if (existingUser) {
      userId = existingUser.id;
      userEmail = existingUser.email || userEmail;
      // Update password to login
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: temporaryPassword });
    } else {
      isNewUser = true;
      // Create new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        password: temporaryPassword,
        user_metadata: {
          mobile: mobile,
          phone: mobile,
          full_name: "WhatsApp User"
        }
      });
      
      if (authError || !authData.user) {
        console.error("Failed to create user during WhatsApp signup:", authError);
        return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
      }
      
      userId = authData.user.id;
      
      // Complete profile
      await completeCustomerAccount(supabaseAdmin, {
        userId: userId,
        fullName: "WhatsApp User",
        email: userEmail,
        mobile: mobile,
        source: "online",
        skipCustomers: true
      });
    }

    // 7. Establish Session
    const { data: sessionData, error: sessionError } = await supabaseRoute.auth.signInWithPassword({
      email: userEmail,
      password: temporaryPassword
    });

    if (sessionError || !sessionData.session) {
      console.error("Failed to establish session:", sessionError);
      return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
    }

    return NextResponse.json({ 
      message: isNewUser ? "Account created successfully." : "Logged in successfully.",
      isNewUser,
      destination: isNewUser ? "/customer/dashboard?onboarding=true" : "/customer/dashboard"
    });

  } catch (error) {
    console.error("Verify OTP endpoint error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
