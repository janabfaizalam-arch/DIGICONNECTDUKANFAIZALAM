import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, createSession } from "@/lib/auth/session";
import { hashPIN } from "@/lib/auth/pin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile, name, address, pincode, city, district, state, referral_code, pin } = body;

    if (!mobile || !name || !pin) {
      return NextResponse.json({ error: "Mobile, Name, and PIN are required." }, { status: 400 });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 6 digits." }, { status: 400 });
    }

    const supabase = getAuthSupabase();

    // 1. Verify that OTP was successfully validated recently
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("mobile", mobile)
      .eq("purpose", "signup")
      .eq("is_verified", true)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: "OTP verification required before signup." }, { status: 403 });
    }

    // 2. Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();

    if (existingCustomer) {
      return NextResponse.json({ error: "Account already exists for this mobile number." }, { status: 409 });
    }

    // 3. Hash the PIN
    const hashedPin = await hashPIN(pin);

    // 4. Create customer record
    const { data: customer, error: createError } = await supabase
      .from("customers")
      .insert({
        mobile,
        name,
        address,
        pincode,
        city,
        district,
        state,
        referral_code,
        hashed_pin: hashedPin,
      })
      .select("id")
      .single();

    if (createError || !customer) {
      console.error("Failed to create customer:", createError);
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    // 5. Clean up OTP record
    await supabase.from("otp_codes").delete().eq("id", otpRecord.id);

    // 6. Create session
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await createSession(customer.id, mobile, userAgent, ipAddress);

    return NextResponse.json({ success: true, message: "Account created successfully." });
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
