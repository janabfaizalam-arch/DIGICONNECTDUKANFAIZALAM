import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { verifyOTPHash, type WhatsappTemplatePurpose, hashOTP } from "@/lib/whatsapp-auth";
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
    
    console.info(`[WhatsApp Auth Debug] Verify OTP request received. Raw mobile: "${mobileRaw}", Clean mobile: "${mobile}", OTP: "${otp}", Purpose: "${purpose}"`);

    if (!indianMobilePattern.test(mobile)) {
      console.warn(`[WhatsApp Auth Debug] Validation failed: Invalid Indian mobile number format: "${mobile}"`);
      return NextResponse.json({ error: `Invalid Indian mobile number format: ${mobile}` }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      console.warn(`[WhatsApp Auth Debug] Validation failed: Invalid OTP format (must be 6 digits): "${otp}"`);
      return NextResponse.json({ error: "Invalid OTP format. It must be exactly 6 digits." }, { status: 400 });
    }

    const mobileLimit = checkRateLimit(`verify_otp_mobile_${mobile}`, 10, 10 * 60 * 1000); 
    if (!mobileLimit.ok) return rateLimitResponse(mobileLimit.retryAfter);

    const supabaseAdmin = getSupabaseAdmin();
    const supabaseRoute = await getSupabaseRouteHandlerClient();

    if (!supabaseAdmin || !supabaseRoute) {
      console.error(`[WhatsApp Auth Debug] Initialization error: Supabase clients not initialized.`);
      return NextResponse.json({ error: "Internal server error. Database connection failure." }, { status: 500 });
    }

    // 1. Fetch the latest OTP for this mobile and purpose
    const searchMobile = `91${mobile}`;
    console.info(`[WhatsApp Auth Debug] Querying auth_otps table. Mobile: "${searchMobile}", Purpose: "${purpose}"`);

    const { data: otps, error: fetchError } = await supabaseAdmin
      .from("auth_otps")
      .select("*")
      .eq("mobile", searchMobile)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(`[WhatsApp Auth Debug] Database query error:`, fetchError);
      return NextResponse.json({ error: `Database error querying OTP: ${fetchError.message}` }, { status: 500 });
    }

    if (!otps || otps.length === 0) {
      // Check if there are ANY records for this mobile (to detect purpose mismatches)
      const { data: allOtps } = await supabaseAdmin
        .from("auth_otps")
        .select("purpose, expires_at, created_at")
        .eq("mobile", searchMobile);

      console.warn(`[WhatsApp Auth Debug] No matching OTP record found for mobile "${searchMobile}" and purpose "${purpose}".`, {
        allRecordsForMobile: allOtps
      });

      const mismatchReason = allOtps && allOtps.length > 0 
        ? `OTP exists but with a different purpose or type (found: ${allOtps.map(r => r.purpose).join(", ")}, requested: ${purpose})`
        : `No OTP record generated for this mobile number.`;

      return NextResponse.json({ error: `OTP lookup failed: ${mismatchReason}. Please request a new OTP.` }, { status: 400 });
    }

    // Use the latest OTP record
    const otpRecord = otps[0];
    console.info(`[WhatsApp Auth Debug] OTP record found:`, {
      id: otpRecord.id,
      mobile: otpRecord.mobile,
      purpose: otpRecord.purpose,
      attempts: otpRecord.attempts,
      expires_at: otpRecord.expires_at,
      created_at: otpRecord.created_at,
      recordCount: otps.length
    });

    // 2. Check Expiry
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      console.warn(`[WhatsApp Auth Debug] OTP expired. Current time: ${now.toISOString()}, Expires at: ${expiresAt.toISOString()}`);
      return NextResponse.json({ error: `OTP has expired at ${expiresAt.toLocaleTimeString()}. Please request a new one.` }, { status: 400 });
    }

    // 3. Check Attempts
    if (otpRecord.attempts >= 3) {
      console.warn(`[WhatsApp Auth Debug] Maximum verification attempts exceeded. Attempts count: ${otpRecord.attempts}`);
      return NextResponse.json({ error: "Too many failed attempts. Please request a new OTP." }, { status: 400 });
    }

    // 4. Verify Hash
    const computedHash = hashOTP(otp);
    const isValid = verifyOTPHash(otp, otpRecord.otp_hash);
    console.info(`[WhatsApp Auth Debug] Hashing comparison:`, {
      submittedOtp: otp,
      computedHash: computedHash,
      storedHash: otpRecord.otp_hash,
      isValid: isValid
    });

    if (!isValid) {
      const nextAttempts = otpRecord.attempts + 1;
      await supabaseAdmin
        .from("auth_otps")
        .update({ attempts: nextAttempts })
        .eq("id", otpRecord.id);

      console.warn(`[WhatsApp Auth Debug] Hash mismatch. Incrementing attempts to ${nextAttempts}.`);
      return NextResponse.json({ error: `Incorrect OTP. Please try again (Attempt ${nextAttempts}/3).` }, { status: 400 });
    }

    // 5. OTP is valid, delete it to prevent reuse
    console.info(`[WhatsApp Auth Debug] OTP verified. Deleting record ID: ${otpRecord.id}`);
    await supabaseAdmin.from("auth_otps").delete().eq("id", otpRecord.id);

    // 6. Handle User Account (Login / Signup)
    let userEmail = `whatsapp_${mobile}@rnos.in`; // fallback email
    let isNewUser = false;
    let userId: string | null = null;
    
    console.info(`[WhatsApp Auth Debug] Finding auth user for mobile: "${mobile}" and email: "${userEmail}"`);
    const existingUser = await findAuthUserByEmailOrMobile(supabaseAdmin, userEmail, mobile);
    console.info(`[WhatsApp Auth Debug] Auth user lookup result:`, existingUser ? { id: existingUser.id, email: existingUser.email } : "User not found");
    
    // Create random secure password for session generation
    const temporaryPassword = crypto.randomBytes(32).toString("hex") + "A1!"; 
    
    if (existingUser) {
      userId = existingUser.id;
      userEmail = existingUser.email || userEmail;
      
      console.info(`[WhatsApp Auth Debug] User exists. Updating password for login: "${userId}"`);
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
        password: temporaryPassword 
      });
      
      if (updateError) {
        console.error(`[WhatsApp Auth Debug] Password update failed:`, updateError);
        return NextResponse.json({ error: `Auth credential update failed: ${updateError.message}` }, { status: 500 });
      }
      console.info(`[WhatsApp Auth Debug] User credentials updated successfully.`);
    } else {
      isNewUser = true;
      console.info(`[WhatsApp Auth Debug] User does not exist. Creating new user with email: "${userEmail}"`);
      
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
        console.error("[WhatsApp Auth Debug] User signup creation failed:", authError);
        return NextResponse.json({ error: `User registration failed: ${authError?.message || "Unknown auth error"}` }, { status: 500 });
      }
      
      userId = authData.user.id;
      console.info(`[WhatsApp Auth Debug] User created successfully. ID: "${userId}". Syncing profile...`);
      
      try {
        await completeCustomerAccount(supabaseAdmin, {
          userId: userId,
          fullName: "WhatsApp User",
          email: userEmail,
          mobile: mobile,
          source: "online",
          skipCustomers: true
        });
        console.info(`[WhatsApp Auth Debug] Profile sync completed.`);
      } catch (profileError) {
        console.error(`[WhatsApp Auth Debug] Profile sync warning:`, profileError);
      }
    }

    // 7. Establish Session
    console.info(`[WhatsApp Auth Debug] Signing in to establish session for email: "${userEmail}"`);
    const { data: sessionData, error: sessionError } = await supabaseRoute.auth.signInWithPassword({
      email: userEmail,
      password: temporaryPassword
    });

    if (sessionError || !sessionData.session) {
      console.error("[WhatsApp Auth Debug] signInWithPassword failed:", sessionError);
      return NextResponse.json({ 
        error: `Supabase login session creation failed: ${sessionError?.message || "Session establishment error. Please try again."}` 
      }, { status: 500 });
    }

    console.info(`[WhatsApp Auth Debug] Session established successfully. User ID: "${sessionData.session.user.id}"`);

    const finalResponse = { 
      message: isNewUser ? "Account created successfully." : "Logged in successfully.",
      isNewUser,
      destination: isNewUser ? "/customer/dashboard?onboarding=true" : "/customer/dashboard"
    };

    console.info(`[WhatsApp Auth Debug] Success! Final response payload:`, finalResponse);
    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error("Verify OTP endpoint error:", error);
    return NextResponse.json({ error: `Internal server error during verification: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
