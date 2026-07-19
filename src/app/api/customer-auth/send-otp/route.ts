import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateOTP, hashOTP, sendWhatsappOTP, WhatsappTemplatePurpose } from "@/lib/whatsapp-auth";
import { checkRateLimit } from "@/lib/auth-v2/rate-limit";

export async function POST(request: Request) {
  try {
    const { mobile, purpose } = await request.json();

    if (!mobile || !purpose) {
      return NextResponse.json({ error: "Mobile number and purpose are required." }, { status: 400 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate Limiting (5 requests per minute per mobile+IP)
    const rateLimit = checkRateLimit(`send_otp_${mobile}_${ipAddress}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Cooldown (1 request per 30 seconds)
    const cooldownLimit = checkRateLimit(`send_otp_cooldown_${mobile}`, 1, 30000);
    if (!cooldownLimit.success) {
      return NextResponse.json({ error: "Please wait 30 seconds before requesting another OTP." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured." }, { status: 500 });
    }

    // Invalidate all previous active OTPs for this mobile
    await supabase
      .from("otp_codes")
      .update({ is_used: true })
      .eq("mobile", mobile)
      .eq("is_used", false);

    // 1. Generate and hash OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    
    // Expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 2. Save OTP Hash to database
    const { error: dbError } = await supabase
      .from("otp_codes")
      .insert([
        {
          mobile,
          otp_hash: otpHash,
          purpose,
          expires_at: expiresAt,
          is_used: false,
        }
      ]);

    if (dbError) {
      console.error("[Auth V2] Error saving OTP:", dbError);
      return NextResponse.json({ error: "Failed to generate OTP." }, { status: 500 });
    }

    // Audit log
    const { data: customer } = await supabase.from("customers").select("id").eq("mobile", mobile).single();
    if (customer?.id) {
      await supabase.from("customer_login_logs").insert([{
        customer_id: customer.id,
        mobile,
        status: "otp_sent",
        ip_address: ipAddress,
        user_agent: userAgent
      }]);
    }

    // 3. Send via AiSensy
    const sendResult = await sendWhatsappOTP(mobile, otp, purpose as WhatsappTemplatePurpose);
    
    if (!sendResult.success) {
      console.error("[Auth V2] AiSensy delivery failed");
      return NextResponse.json(
        { error: "Unable to send OTP. Please try again in a few minutes." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully." });

  } catch (error) {
    console.error("[Auth V2] send-otp error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
