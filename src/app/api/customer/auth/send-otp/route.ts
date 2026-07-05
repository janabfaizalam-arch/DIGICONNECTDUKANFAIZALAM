import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase } from "@/lib/auth/session";
import { generateOTP, hashOTP, sendWhatsappOTP } from "@/lib/whatsapp-auth";
import { WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";

export async function POST(req: NextRequest) {
  try {
    const { mobile, purpose } = await req.json();

    if (!mobile || !purpose) {
      return NextResponse.json({ error: "Mobile number and purpose are required." }, { status: 400 });
    }

    if (!["login", "signup", "password_reset"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose." }, { status: 400 });
    }

    const supabase = getAuthSupabase();

    // Check rate limit by looking at recent OTP requests for this mobile
    const { count } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("mobile", mobile)
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes

    if (count && count >= 5) {
      return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
    }

    const otp = generateOTP();
    const hashed = hashOTP(otp);
    
    // Invalidate existing OTPs for this mobile and purpose
    await supabase
      .from("otp_codes")
      .delete()
      .eq("mobile", mobile)
      .eq("purpose", purpose);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        mobile,
        purpose,
        hashed_code: hashed,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert OTP:", insertError);
      return NextResponse.json({ error: "Failed to generate OTP." }, { status: 500 });
    }

    const whatsappRes = await sendWhatsappOTP(mobile, otp, purpose as WhatsappTemplatePurpose);

    if (!whatsappRes.success) {
      return NextResponse.json({ error: "Failed to send WhatsApp message." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
