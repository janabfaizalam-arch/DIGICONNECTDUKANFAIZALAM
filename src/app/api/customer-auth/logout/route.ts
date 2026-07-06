import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, hashRefreshToken } from "@/lib/auth-v2/session";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    let allDevices = false;
    try {
      const body = await request.json();
      allDevices = body?.allDevices === true;
    } catch {
      // Ignore if body is empty or not JSON
    }

    if (refreshToken) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const hash = hashRefreshToken(refreshToken);

        // Fetch session to know the customer_id
        const { data: session } = await supabase
          .from("customer_sessions")
          .select("customer_id")
          .eq("refresh_token_hash", hash)
          .single();

        if (session?.customer_id) {
          if (allDevices) {
            // Delete all sessions for this customer
            await supabase.from("customer_sessions").delete().eq("customer_id", session.customer_id);
            
            await supabase.from("customer_login_logs").insert([{
              customer_id: session.customer_id,
              mobile: "unknown",
              status: "logout_all",
              ip_address: ipAddress,
              user_agent: userAgent
            }]);
          } else {
            // Delete just this session
            await supabase.from("customer_sessions").delete().eq("refresh_token_hash", hash);

            await supabase.from("customer_login_logs").insert([{
              customer_id: session.customer_id,
              mobile: "unknown",
              status: "logout",
              ip_address: ipAddress,
              user_agent: userAgent
            }]);
          }
        }
      }
    }

    await clearAuthCookies();

    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("[Auth V2] logout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
