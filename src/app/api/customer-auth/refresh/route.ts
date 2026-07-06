import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { REFRESH_TOKEN_COOKIE, hashRefreshToken, setAuthCookies, generateRefreshToken, DEVICE_ID_COOKIE } from "@/lib/auth-v2/session";
import { signAccessToken } from "@/lib/auth-v2/jwt";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const deviceIdentifier = cookieStore.get(DEVICE_ID_COOKIE)?.value;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token provided." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    const hash = hashRefreshToken(refreshToken);

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from("customer_sessions")
      .select("id, customer_id, expires_at, device_id, customers (mobile, is_active)")
      .eq("refresh_token_hash", hash)
      .single();

    if (sessionError || !session || new Date(session.expires_at) < new Date()) {
      // Invalid or expired session
      return NextResponse.json({ error: "Session expired." }, { status: 401 });
    }

    const customer = session.customers as unknown as { mobile: string; is_active: boolean };
    if (!customer || !customer.is_active) {
      return NextResponse.json({ error: "Account disabled." }, { status: 403 });
    }

    // Refresh Token Rotation with 60s Grace Period
    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Shrink the old session's expiry to 60 seconds from now to allow concurrent requests to succeed
    const gracePeriodExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    
    await supabase
      .from("customer_sessions")
      .update({ expires_at: gracePeriodExpiresAt })
      .eq("id", session.id);

    // Create a new session for the new refresh token
    await supabase.from("customer_sessions").insert([{
      customer_id: session.customer_id,
      refresh_token_hash: newHash,
      expires_at: newExpiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
      device_id: session.device_id
    }]);

    // Issue new access token
    const newAccessToken = await signAccessToken({
      sub: session.customer_id,
      mobile: customer.mobile,
      role: 'customer'
    });

    // Audit log
    await supabase.from("customer_login_logs").insert([{
      customer_id: session.customer_id,
      mobile: customer.mobile,
      status: "refresh_token_used",
      ip_address: ipAddress,
      user_agent: userAgent
    }]);

    await setAuthCookies(newAccessToken, newRefreshToken, deviceIdentifier);

    return NextResponse.json({ success: true, message: "Token refreshed successfully." });
  } catch (error) {
    console.error("[Auth V2] refresh error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
