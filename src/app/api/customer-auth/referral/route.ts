import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth-v2/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.payload.sub;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured" }, { status: 500 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, mobile")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Generate a simple referral code based on their mobile if they don't have one explicitly
    const myReferralCode = `REF${customer.mobile.slice(-4)}`;

    // Get count of users who signed up with my referral code
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", myReferralCode);

    return NextResponse.json({
      referralCode: myReferralCode,
      referralCount: count || 0
    });

  } catch (error) {
    console.error("[Auth V2] Referral API GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
