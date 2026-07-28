import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/auth-v2/password";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { mobile, newPin } = await request.json();

    if (!mobile || !newPin) {
      return NextResponse.json({ error: "Mobile and new PIN are required." }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`reset_pin_${mobile}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
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
      .eq("purpose", "password_reset")
      .eq("is_used", true)
      .gte("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(1);

    if (otpError || !verifiedOtp || verifiedOtp.length === 0) {
      return NextResponse.json({ error: "Mobile number not verified or request expired." }, { status: 403 });
    }

    // Hash the new PIN
    const hashedPin = await hashPin(newPin);

    // Update Customer
    const { error: updateError } = await supabase
      .from("customers")
      .update({ hashed_pin: hashedPin })
      .eq("mobile", mobile);

    if (updateError) {
      console.error("[Auth V2] update pin error:", updateError);
      return NextResponse.json({ error: "Failed to reset PIN." }, { status: 500 });
    }

    // Ideally, we invalidate all existing sessions here.
    const { data: customer } = await supabase.from("customers").select("id").eq("mobile", mobile).single();
    if (customer) {
      await supabase.from("customer_sessions").delete().eq("customer_id", customer.id);
    }

    return NextResponse.json({ success: true, message: "PIN reset successfully. Please login." });

  } catch (error) {
    console.error("[Auth V2] reset-pin error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
