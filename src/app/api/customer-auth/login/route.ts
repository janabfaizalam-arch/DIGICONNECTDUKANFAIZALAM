import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPin } from "@/lib/auth-v2/password";
import { setAuthCookies, generateRefreshToken, hashRefreshToken, DEVICE_ID_COOKIE } from "@/lib/auth-v2/session";
import { signAccessToken } from "@/lib/auth-v2/jwt";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export async function POST(request: Request) {
  try {
    const { mobile, pin, rememberMe } = await request.json();

    if (!mobile || !pin) {
      return NextResponse.json({ error: "Mobile and PIN are required." }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate Limiting (10 attempts per minute per mobile+IP)
    const rateLimit = checkRateLimit(`login_${mobile}_${ipAddress}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("id, mobile, hashed_pin, is_active")
      .eq("mobile", mobile)
      .single();

    if (fetchError || !customer) {
      // Don't leak whether user exists or not, just generic message
      return NextResponse.json({ error: "Invalid mobile number or PIN." }, { status: 401 });
    }

    if (!customer.is_active) {
      return NextResponse.json({ error: "Account is disabled. Please contact support." }, { status: 403 });
    }

    // Check for Lockout (5 failed attempts in last 15 mins)
    const lockoutWindow = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from("customer_login_logs")
      .select("status")
      .eq("customer_id", customer.id)
      .gte("created_at", lockoutWindow)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentAttempts && recentAttempts.length >= 5) {
      const allFailed = recentAttempts.every(attempt => attempt.status === "failed_pin");
      if (allFailed) {
        return NextResponse.json({ error: "Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes." }, { status: 403 });
      }
    }

    const isValid = await verifyPin(pin, customer.hashed_pin);

    if (!isValid) {
      // Log failed attempt
      await supabase.from("customer_login_logs").insert([{
        customer_id: customer.id,
        mobile,
        status: "failed_pin",
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: "Invalid PIN"
      }]);
      return NextResponse.json({ error: "Invalid mobile number or PIN." }, { status: 401 });
    }

    // Log successful attempt
    await supabase.from("customer_login_logs").insert([{
      customer_id: customer.id,
      mobile,
      status: "success",
      ip_address: ipAddress,
      user_agent: userAgent
    }]);

    // Generate JWTs
    const accessToken = await signAccessToken({
      sub: customer.id,
      mobile: customer.mobile,
      role: 'customer'
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresInDays = rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000); 

    // Device Tracking
    const cookieStore = await cookies();
    let deviceIdentifier = cookieStore.get(DEVICE_ID_COOKIE)?.value;
    
    if (!deviceIdentifier) {
      deviceIdentifier = globalThis.crypto.randomUUID();
    }
    
    const deviceName = userAgent.substring(0, 50);

    let deviceId = null;
    const { data: deviceRecord } = await supabase.from("customer_devices").upsert([{
      customer_id: customer.id,
      device_identifier: deviceIdentifier,
      device_name: deviceName,
      last_active: new Date().toISOString()
    }], { onConflict: 'customer_id, device_identifier' }).select("id").single();

    if (deviceRecord) {
      deviceId = deviceRecord.id;
    }

    // Save Session
    await supabase.from("customer_sessions").insert([{
      customer_id: customer.id,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
      device_id: deviceId
    }]);


    // Set Cookies
    await setAuthCookies(accessToken, refreshToken, deviceIdentifier);

    return NextResponse.json({ success: true, message: "Logged in successfully." });

  } catch (error) {
    console.error("[Auth V2] login error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
