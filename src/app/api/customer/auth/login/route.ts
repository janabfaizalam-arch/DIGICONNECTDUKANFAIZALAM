import { NextRequest, NextResponse } from "next/server";
import { getAuthSupabase, createSession } from "@/lib/auth/session";
import { verifyPIN } from "@/lib/auth/pin";

export async function POST(req: NextRequest) {
  try {
    const { mobile, pin } = await req.json();

    if (!mobile || !pin) {
      return NextResponse.json({ error: "Mobile number and PIN are required." }, { status: 400 });
    }

    const supabase = getAuthSupabase();
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 1. Check Brute Force (Limit to 5 failed attempts in 15 mins)
    const { count, error: bruteForceError } = await supabase
      .from("customer_login_logs")
      .select("*", { count: "exact", head: true })
      .eq("mobile", mobile)
      .in("status", ["failed_pin", "failed_blocked"])
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (count && count >= 5) {
      await supabase.from("customer_login_logs").insert({
        mobile, ip_address: ipAddress, user_agent: userAgent, status: "failed_blocked"
      });
      return NextResponse.json({ error: "Account temporarily blocked due to too many failed attempts. Try again later or reset PIN." }, { status: 429 });
    }

    // 2. Fetch Customer
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("id, hashed_pin, is_active")
      .eq("mobile", mobile)
      .maybeSingle();

    if (fetchError || !customer) {
      await supabase.from("customer_login_logs").insert({ mobile, ip_address: ipAddress, user_agent: userAgent, status: "failed_pin" });
      return NextResponse.json({ error: "Invalid mobile number or PIN." }, { status: 401 });
    }

    if (!customer.is_active) {
      return NextResponse.json({ error: "Account is deactivated. Please contact support." }, { status: 403 });
    }

    // 3. Verify PIN
    const isPinValid = await verifyPIN(customer.hashed_pin, pin);

    if (!isPinValid) {
      await supabase.from("customer_login_logs").insert({ mobile, ip_address: ipAddress, user_agent: userAgent, status: "failed_pin" });
      return NextResponse.json({ error: "Invalid mobile number or PIN." }, { status: 401 });
    }

    // 4. Log Success
    await supabase.from("customer_login_logs").insert({ mobile, ip_address: ipAddress, user_agent: userAgent, status: "success" });

    // 5. Create Session
    await createSession(customer.id, mobile, userAgent, ipAddress);

    return NextResponse.json({ success: true, message: "Logged in successfully." });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
