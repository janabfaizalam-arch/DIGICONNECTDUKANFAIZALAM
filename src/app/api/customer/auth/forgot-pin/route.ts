import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase } from "@/lib/auth/session";
import { hashPIN } from "@/lib/auth/pin";

export async function POST(req: NextRequest) {
  try {
    const { mobile, newPin } = await req.json();

    if (!mobile || !newPin) {
      return NextResponse.json({ error: "Mobile number and new PIN are required." }, { status: 400 });
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be exactly 6 digits." }, { status: 400 });
    }

    const supabase = getAuthSupabase();

    // 1. Verify OTP state
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("mobile", mobile)
      .eq("purpose", "password_reset")
      .eq("is_verified", true)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: "OTP verification required before resetting PIN." }, { status: 403 });
    }

    // 2. Hash New PIN
    const hashedPin = await hashPIN(newPin);

    // 3. Update Customer
    const { error: updateError } = await supabase
      .from("customers")
      .update({ hashed_pin: hashedPin })
      .eq("mobile", mobile);

    if (updateError) {
      console.error("Failed to update PIN:", updateError);
      return NextResponse.json({ error: "Failed to update PIN." }, { status: 500 });
    }

    // 4. Revoke existing sessions (Optional but good for security)
    const { data: customer } = await supabase.from("customers").select("id").eq("mobile", mobile).single();
    if (customer) {
      await supabase.from("customer_sessions").update({ is_revoked: true }).eq("customer_id", customer.id);
    }

    // 5. Clean up OTP record
    await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

    return NextResponse.json({ success: true, message: "PIN updated successfully. You can now login." });
  } catch (error) {
    console.error("Forgot PIN Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
