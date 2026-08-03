import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateOTP, hashOTP, sendWhatsappOTP } from "@/lib/whatsapp-auth";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json();

    if (!mobile) {
      return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`forgot_pin_${mobile}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    // Ensure user exists
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .single();

    if (!customer) {
      // Don't leak existence, just say success
      return NextResponse.json({ success: true, message: "If the number exists, an OTP has been sent." });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").insert([{
      mobile,
      otp_hash: otpHash,
      purpose: "password_reset",
      expires_at: expiresAt,
      is_used: false,
    }]);

    const sendResult = await sendWhatsappOTP(mobile, otp, "password_reset");
    if (!sendResult.success) {
      console.error("[Auth V2] forgot-pin provider_send_failed", {
        mobileMasked: `${String(mobile).slice(0, 2)}******${String(mobile).slice(-2)}`,
        error: sendResult.error,
      });
      return NextResponse.json(
        { error: sendResult.error || "Unable to send OTP. Please try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "If the number exists, an OTP has been sent." });

  } catch (error) {
    console.error("[Auth V2] forgot-pin error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
