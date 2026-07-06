import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/auth-v2/password";
import { setAuthCookies, generateRefreshToken, hashRefreshToken } from "@/lib/auth-v2/session";
import { signAccessToken } from "@/lib/auth-v2/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      mobile, pin, name, father_or_husband_name, email, 
      house_no, street, landmark, country, 
      pincode, city, district, state, referral_code 
    } = body;

    if (!mobile || !pin || !name) {
      return NextResponse.json({ error: "Mobile, PIN, and Name are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    // Security check: Ensure there is a recently verified OTP for this mobile
    const { data: verifiedOtp, error: otpError } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("mobile", mobile)
      .eq("purpose", "signup")
      .eq("is_used", true)
      .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // verified in last 30 mins
      .limit(1);

    if (otpError || !verifiedOtp || verifiedOtp.length === 0) {
      return NextResponse.json({ error: "Mobile number not verified." }, { status: 403 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this mobile number." }, { status: 400 });
    }

    const hashedPin = await hashPin(pin);

    // Create Customer
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert([{
        mobile,
        name,
        father_or_husband_name,
        email,
        house_no,
        street,
        landmark,
        country: country || 'India',
        pincode,
        city,
        district,
        state,
        referral_code,
        hashed_pin: hashedPin
      }])
      .select("id, mobile")
      .single();

    if (createError || !newCustomer) {
      console.error("[Auth V2] create customer error:", createError);
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    // Generate JWTs
    const accessToken = await signAccessToken({
      sub: newCustomer.id,
      mobile: newCustomer.mobile,
      role: 'customer'
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";

    // Device Tracking
    const deviceIdentifier = crypto.createHash('sha256').update(userAgent).digest('hex');
    const deviceName = userAgent.substring(0, 50);

    let deviceId = null;
    const { data: deviceRecord } = await supabase.from("customer_devices").upsert([{
      customer_id: newCustomer.id,
      device_identifier: deviceIdentifier,
      device_name: deviceName,
      last_active: new Date().toISOString()
    }], { onConflict: 'customer_id, device_identifier' }).select("id").single();

    if (deviceRecord) {
      deviceId = deviceRecord.id;
    }

    // Save Session
    await supabase.from("customer_sessions").insert([{
      customer_id: newCustomer.id,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
      device_id: deviceId
    }]);

    // Set Cookies
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({ success: true, message: "Account created successfully." });

  } catch (error) {
    console.error("[Auth V2] set-pin error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
