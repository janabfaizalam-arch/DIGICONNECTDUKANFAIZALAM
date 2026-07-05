import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase } from "@/lib/auth/session";
import { verifyOTPHash } from "@/lib/whatsapp-auth";

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp, purpose } = await req.json();

    if (!mobile || !otp || !purpose) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = getAuthSupabase();

    const { data: otpRecord, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("mobile", mobile)
      .eq("purpose", purpose)
      .maybeSingle();

    if (error || !otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP has expired." }, { status: 400 });
    }

    if (otpRecord.attempts >= 3) {
      // Invalidate if too many attempts
      await supabase.from("otp_codes").delete().eq("id", otpRecord.id);
      return NextResponse.json({ error: "Too many failed attempts. Request a new OTP." }, { status: 429 });
    }

    const isValid = verifyOTPHash(otp, otpRecord.hashed_code);

    if (!isValid) {
      await supabase
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    // Mark as verified
    await supabase
      .from("otp_codes")
      .update({ is_verified: true })
      .eq("id", otpRecord.id);

    return NextResponse.json({ success: true, message: "OTP verified." });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
