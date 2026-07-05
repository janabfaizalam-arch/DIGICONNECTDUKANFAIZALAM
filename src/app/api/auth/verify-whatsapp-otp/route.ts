import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyOTPHash, type WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";
import { indianMobilePattern } from "@/lib/customer-oauth";
import { completeCustomerAccount, findAuthUserByEmailOrMobile, normalizeCustomerMobile } from "@/lib/customer-identity";
import { verifyReferralSignature, recordAttribution } from "@/lib/referrals";

function getWhatsAppFallbackEmail(mobile: string) {
  return `whatsapp_${mobile}@rnos.in`;
}

function getSupabaseAuthSessionBlockedResponse() {
  return NextResponse.json(
    {
      error:
        "OTP verified and customer linked, but Supabase session creation is blocked by the current constraints. Supabase Auth sessions require a Supabase-issued access token and refresh token from a supported sign-in flow.",
      code: "WHATSAPP_SESSION_CREATION_UNSUPPORTED",
    },
    { status: 501 },
  );
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    const ipLimit = checkRateLimit(`verify_otp_ip_${ip}`, 20, 60 * 60 * 1000);
    if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter);

    const body = await request.json().catch(() => ({}));
    const mobileRaw = String(body.mobile || "").trim();
    const otp = String(body.otp || "").replace(/\D/g, "").slice(0, 6);
    const purpose = String(body.purpose || "login") as WhatsappTemplatePurpose;
    const mobile = mobileRaw.replace(/\D/g, "").slice(-10);
    const searchMobile = `91${mobile}`;
    const fallbackEmail = getWhatsAppFallbackEmail(mobile);

    console.info("[WhatsApp Auth] AiSensy OTP verification requested", {
      mobile,
      searchMobile,
      purpose,
      otpLength: otp.length,
      ip,
    });

    if (!indianMobilePattern.test(mobile)) {
      console.warn("[WhatsApp Auth] OTP verify validation failed: invalid mobile", { mobile });
      return NextResponse.json({ error: `Invalid Indian mobile number format: ${mobile}` }, { status: 400 });
    }

    if (otp.length !== 6) {
      console.warn("[WhatsApp Auth] OTP verify validation failed: invalid OTP format", { otpLength: otp.length });
      return NextResponse.json({ error: "Invalid OTP format. It must be exactly 6 digits." }, { status: 400 });
    }

    const mobileLimit = checkRateLimit(`verify_otp_mobile_${mobile}`, 10, 10 * 60 * 1000);
    if (!mobileLimit.ok) return rateLimitResponse(mobileLimit.retryAfter);

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error("[WhatsApp Auth] Supabase admin client not initialized");
      return NextResponse.json({ error: "Internal server error. Database connection failure." }, { status: 500 });
    }

    console.info("[WhatsApp Auth] Looking up latest stored AiSensy OTP", {
      mobile: searchMobile,
      purpose,
    });
    const { data: otps, error: fetchError } = await supabaseAdmin
      .from("auth_otps")
      .select("*")
      .eq("mobile", searchMobile)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[WhatsApp Auth] OTP lookup failed", {
        mobile: searchMobile,
        purpose,
        message: fetchError.message,
        code: fetchError.code,
      });
      return NextResponse.json({ error: `Database error querying OTP: ${fetchError.message}` }, { status: 500 });
    }

    if (!otps || otps.length === 0) {
      const { data: allOtps } = await supabaseAdmin
        .from("auth_otps")
        .select("purpose, expires_at, created_at")
        .eq("mobile", searchMobile);

      console.warn("[WhatsApp Auth] No matching OTP record found", {
        mobile: searchMobile,
        purpose,
        allRecordsForMobile: allOtps ?? [],
      });

      return NextResponse.json({ error: "OTP not found. Please request a new OTP." }, { status: 400 });
    }

    const otpRecord = otps[0];
    console.info("[WhatsApp Auth] OTP record found", {
      id: otpRecord.id,
      mobile: otpRecord.mobile,
      purpose: otpRecord.purpose,
      attempts: otpRecord.attempts,
      expiresAt: otpRecord.expires_at,
      recordCount: otps.length,
    });

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      console.warn("[WhatsApp Auth] OTP expired", {
        id: otpRecord.id,
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    if (otpRecord.attempts >= 3) {
      console.warn("[WhatsApp Auth] OTP max attempts exceeded", {
        id: otpRecord.id,
        attempts: otpRecord.attempts,
      });
      return NextResponse.json({ error: "Too many failed attempts. Please request a new OTP." }, { status: 400 });
    }

    const isValid = verifyOTPHash(otp, otpRecord.otp_hash);
    console.info("[WhatsApp Auth] OTP hash verification completed", {
      id: otpRecord.id,
      isValid,
    });

    if (!isValid) {
      const nextAttempts = otpRecord.attempts + 1;
      await supabaseAdmin.from("auth_otps").update({ attempts: nextAttempts }).eq("id", otpRecord.id);

      console.warn("[WhatsApp Auth] OTP verification failed", {
        id: otpRecord.id,
        nextAttempts,
      });
      return NextResponse.json({ error: `Incorrect OTP. Please try again (Attempt ${nextAttempts}/3).` }, { status: 400 });
    }

    console.info("[WhatsApp Auth] OTP verified. Deleting single-use OTP record", { id: otpRecord.id });
    await supabaseAdmin.from("auth_otps").delete().eq("id", otpRecord.id);

    console.info("[WhatsApp Auth] Auth user lookup started", {
      email: fallbackEmail,
      mobile,
    });
    const existingUser = await findAuthUserByEmailOrMobile(supabaseAdmin, fallbackEmail, mobile);
    const isNewUser = !existingUser;

    let userId = existingUser?.id ?? null;
    let userEmail = existingUser?.email || fallbackEmail;
    const fullName = String(existingUser?.user_metadata?.full_name ?? existingUser?.user_metadata?.name ?? "WhatsApp User");

    if (existingUser) {
      console.info("[WhatsApp Auth] Auth user lookup succeeded", {
        userId: existingUser.id,
        email: existingUser.email ?? null,
        mobile: normalizeCustomerMobile(String(existingUser.phone ?? existingUser.user_metadata?.mobile ?? existingUser.user_metadata?.phone ?? "")),
      });

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          mobile,
          phone: mobile,
          role: existingUser.user_metadata?.role ?? "customer",
          auth_provider: "whatsapp_aisensy",
        },
      });

      if (updateError) {
        console.error("[WhatsApp Auth] Existing Auth user metadata update failed", {
          userId: existingUser.id,
          message: updateError.message,
        });
        return NextResponse.json({ error: `Auth user update failed: ${updateError.message}` }, { status: 500 });
      }
    } else {
      console.info("[WhatsApp Auth] Auth user not found. Creating Auth user without password", {
        email: fallbackEmail,
        mobile,
      });
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: fallbackEmail,
        email_confirm: true,
        user_metadata: {
          mobile,
          phone: mobile,
          full_name: "WhatsApp User",
          role: "customer",
          auth_provider: "whatsapp_aisensy",
        },
      });

      if (createError || !createData.user) {
        console.error("[WhatsApp Auth] Auth user creation failed", {
          message: createError?.message ?? "No user returned",
        });
        return NextResponse.json({ error: `User registration failed: ${createError?.message || "Unknown auth error"}` }, { status: 500 });
      }

      userId = createData.user.id;
      userEmail = createData.user.email || fallbackEmail;
      console.info("[WhatsApp Auth] Auth user created", {
        userId,
        email: userEmail,
        mobile,
      });
    }

    if (!userId) {
      console.error("[WhatsApp Auth] Auth user id missing after lookup/create", { email: userEmail, mobile });
      return NextResponse.json({ error: "Auth user resolution failed." }, { status: 500 });
    }

    console.info("[WhatsApp Auth] Customer lookup/link started", {
      userId,
      email: userEmail,
      mobile,
    });
    await completeCustomerAccount(supabaseAdmin, {
      userId,
      fullName,
      email: userEmail,
      mobile,
      source: "online",
    });
    console.info("[WhatsApp Auth] Customer lookup/link completed", {
      userId,
      email: userEmail,
      mobile,
    });

    try {
      const cookieStore = await cookies();
      const referralCookie = cookieStore.get("dcd_referral")?.value;
      console.info("[WhatsApp Auth] Referral cookie checked", {
        hasReferralCookie: Boolean(referralCookie),
        userId,
      });

      if (referralCookie) {
        const refData = JSON.parse(referralCookie);
        const { token, clickId, timestamp, signature } = refData;
        const isValidReferral = verifyReferralSignature(token, clickId, timestamp, signature);
        console.info("[WhatsApp Auth] Referral signature checked", {
          token: token ?? null,
          clickId: clickId ?? null,
          isValidReferral,
        });

        if (isValidReferral) {
          const { data: referral } = await supabaseAdmin
            .from("service_referrals")
            .select("partner_id")
            .eq("token", token)
            .maybeSingle();

          if (referral) {
            let utm: Record<string, string | null> = {};
            if (clickId) {
              const { data: click } = await supabaseAdmin
                .from("referral_clicks")
                .select("utm_source, utm_medium, utm_campaign, utm_term, utm_content, user_agent")
                .eq("id", clickId)
                .maybeSingle();
              if (click) {
                utm = click;
              }
            }

            await recordAttribution({
              token,
              partnerId: referral.partner_id,
              customerId: userId,
              deviceId: utm.user_agent || null,
              source: utm.utm_source || "whatsapp_login",
              utmSource: utm.utm_source,
              utmMedium: utm.utm_medium,
              utmCampaign: utm.utm_campaign,
              utmTerm: utm.utm_term,
              utmContent: utm.utm_content,
            });
            console.info("[WhatsApp Auth] Referral attribution saved", { userId });
          }
        }
      }
    } catch (cookieErr) {
      console.error("[WhatsApp Auth] Referral processing failed:", cookieErr);
    }

    const destination = isNewUser ? "/customer/dashboard?onboarding=true" : "/customer/dashboard";
    console.error("[WhatsApp Auth] Session creation blocked by supported Supabase Auth constraints", {
      userId,
      email: userEmail,
      mobile,
      destination,
      cookiesWritten: false,
      redirectIssued: false,
      blockedReason:
        "AiSensy OTP verification is outside Supabase Auth. Existing app session architecture requires Supabase-issued access and refresh tokens from OAuth exchange, password sign-in, signup, or another supported Supabase Auth sign-in flow.",
      requestProhibitedSessionWorkarounds: true,
    });

    return getSupabaseAuthSessionBlockedResponse();
  } catch (error) {
    console.error("[WhatsApp Auth] Verify OTP endpoint error:", error);
    return NextResponse.json(
      { error: `Internal server error during verification: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    );
  }
}
