import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashOTP } from "@/lib/whatsapp-auth";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export async function POST(request: Request) {
  try {
    const { mobile, otp, purpose } = await request.json();

    if (!mobile || !otp || !purpose) {
      return NextResponse.json({ error: "Mobile, OTP, and purpose are required." }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate Limiting (10 attempts per minute per mobile+IP)
    const rateLimit = checkRateLimit(`verify_otp_req_${mobile}_${ipAddress}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    // Max 5 failures in 15 minutes
    const failureLimit = checkRateLimit(`verify_otp_fails_${mobile}_${ipAddress}`, 5, 15 * 60 * 1000);
    if (!failureLimit.success) {
      return NextResponse.json({ error: "Maximum verification attempts exceeded. Please try again in 15 minutes." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    const otpHash = hashOTP(otp);

    // Find the OTP code in the database
    const { data: codes, error: dbError } = await supabase
      .from("otp_codes")
      .select("id, expires_at, is_used")
      .eq("mobile", mobile)
      .eq("purpose", purpose)
      .eq("otp_hash", otpHash)
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: customer } = await supabase.from("customers").select("id").eq("mobile", mobile).single();

    if (dbError || !codes || codes.length === 0) {
      if (customer?.id) {
        await supabase.from("customer_login_logs").insert([{
          customer_id: customer.id, mobile, status: "otp_failed", ip_address: ipAddress, user_agent: userAgent
        }]);
      }
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    const record = codes[0];

    if (record.is_used) {
      return NextResponse.json({ error: "OTP has already been used." }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP has expired." }, { status: 400 });
    }

    // Mark as used
    await supabase
      .from("otp_codes")
      .update({ is_used: true })
      .eq("id", record.id);

    if (customer?.id) {
      await supabase.from("customer_login_logs").insert([{
        customer_id: customer.id, mobile, status: "otp_verified", ip_address: ipAddress, user_agent: userAgent
      }]);
    }

    return NextResponse.json({ success: true, message: "OTP verified successfully." });

  } catch (error) {
    console.error("[Auth V2] verify-otp error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
