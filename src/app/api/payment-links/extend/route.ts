import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { code, extendHours = 24 } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // Lookup payment link
    const { data: link, error: linkError } = await supabase
      .from("payment_links")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }

    if (link.status === "paid") {
      return NextResponse.json({ error: "Cannot extend a paid link." }, { status: 400 });
    }

    if (link.status === "cancelled") {
      return NextResponse.json({ error: "Cannot extend a cancelled link." }, { status: 400 });
    }

    // Verify permission: Either own AP, CEO, or admin/staff
    let hasAccess = false;
    const ap = await getAgencyPartnerByUserId(user.id);
    
    if (ap && link.partner_id === ap.id) {
      hasAccess = true;
    } else if (ap) {
      // Check if CEO
      const { data: teamCheck } = await supabase
        .from("agency_partners")
        .select("id")
        .eq("id", link.partner_id)
        .eq("created_by_user_id", user.id)
        .maybeSingle();
      if (teamCheck) hasAccess = true;
    } else {
      // Check if admin or staff
      const { data: userRole } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (userRole && ["super_admin", "admin", "staff"].includes(userRole.role)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Calculate new expiry (from now or from existing expiry if not yet expired)
    const currentExpiry = new Date(link.expires_at);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + extendHours * 60 * 60 * 1000);

    // Update status to pending (in case it was expired) and set new expires_at
    const { error: updateError } = await supabase
      .from("payment_links")
      .update({
        status: "pending",
        expires_at: newExpiry.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", link.id);

    if (updateError) {
      console.error("[payment-links/extend] Update error:", updateError);
      return NextResponse.json({ error: "Failed to extend payment link expiry." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Payment link expiry extended successfully.",
      newExpiresAt: newExpiry.toISOString(),
    });
  } catch (error) {
    console.error("[payment-links/extend] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
