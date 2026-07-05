import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { signReferralToken, verifyReferralSignature } from "@/lib/referrals";

export async function POST(request: Request) {
  try {
    const { token, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // 1. Enforce Configurable Attribution Policy (FIRST VALID CLICK WINS)
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get("dcd_referral")?.value;
    const policy = process.env.REFERRAL_ATTRIBUTION_POLICY || "first_click";

    if (existingCookie && policy === "first_click") {
      try {
        const refData = JSON.parse(existingCookie);
        const isValid = verifyReferralSignature(refData.token, refData.clickId, refData.timestamp, refData.signature);
        if (isValid) {
          return NextResponse.json({
            success: true,
            clickId: refData.clickId,
            message: "Existing referral attribution preserved."
          });
        }
      } catch (err) {
        console.warn("[referrals/click] Existing cookie verification failed:", err);
      }
    }

    // Lookup token
    const { data: referral, error: referralError } = await supabase
      .from("service_referrals")
      .select("id, partner_id")
      .eq("token", token)
      .maybeSingle();

    if (referralError || !referral) {
      return NextResponse.json({ error: "Invalid referral token." }, { status: 404 });
    }

    // 2. Prevent Self-Referrals
    const user = await getCurrentUser().catch(() => null);
    if (user) {
      const { data: ap } = await supabase
        .from("agency_partners")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ap && referral.partner_id === ap.id) {
        return NextResponse.json({ error: "Self-referral is not allowed." }, { status: 400 });
      }
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";
    
    // Simple device detection
    let deviceType = "desktop";
    if (/mobile/i.test(userAgent)) {
      deviceType = "mobile";
    } else if (/tablet/i.test(userAgent)) {
      deviceType = "tablet";
    }

    // Insert click log
    const { data: clickData, error: clickError } = await supabase
      .from("referral_clicks")
      .insert({
        referral_id: referral.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_term: utmTerm || null,
        utm_content: utmContent || null,
      })
      .select("id")
      .single();

    if (clickError) {
      console.error("[referrals/click] Insert click error:", clickError);
    }

    const response = NextResponse.json({ 
      success: true, 
      clickId: clickData?.id || null 
    });

    // 3. Set secure HMAC signed cookie
    const timestamp = Date.now();
    const clickId = clickData?.id || "";
    const signature = signReferralToken(token, clickId, timestamp);

    const cookieValue = JSON.stringify({
      token,
      clickId,
      timestamp,
      signature
    });

    response.cookies.set("dcd_referral", cookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Allow client to read, safe
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[referrals/click] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

