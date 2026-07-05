import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function generatePaymentCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "APL-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const ap = await getAgencyPartnerByUserId(user.id);
    if (!ap) {
      return NextResponse.json({ error: "Agency Partner profile not found." }, { status: 403 });
    }

    if (ap.status !== "active") {
      return NextResponse.json({ error: "Agency Partner profile is not active." }, { status: 403 });
    }

    const { applicationId, expiryHours = 24 } = await request.json();
    if (!applicationId || typeof applicationId !== "string") {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // Lookup application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, user_id, service_name, amount, payment_status, status, agency_partner_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Check ownership scope (either own AP or created by their team member)
    if (application.agency_partner_id !== ap.id) {
      // Check if it is a CEO checking their team member's application
      const { data: teamCheck } = await supabase
        .from("agency_partners")
        .select("id")
        .eq("id", application.agency_partner_id)
        .eq("created_by_user_id", user.id)
        .maybeSingle();

      if (!teamCheck) {
        return NextResponse.json({ error: "Access denied to this application." }, { status: 403 });
      }
    }

    if (application.payment_status === "verified") {
      return NextResponse.json({ error: "Application is already paid." }, { status: 400 });
    }

    // Generate unique code
    let code = generatePaymentCode();
    let isUnique = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("payment_links")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) {
        isUnique = true;
        break;
      }
      code = generatePaymentCode();
    }

    if (!isUnique) {
      return NextResponse.json({ error: "Failed to generate unique code. Please try again." }, { status: 500 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Get customer name
    const { data: customer } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", application.user_id)
      .maybeSingle();

    const customerName = customer?.full_name || "Customer";

    // Insert payment link
    const { error: insertError } = await supabase
      .from("payment_links")
      .insert({
        code,
        application_id: application.id,
        partner_id: ap.id,
        customer_id: application.user_id,
        amount: application.amount,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[payment-links/generate] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save payment link details." }, { status: 500 });
    }

    const paymentLinkUrl = `${request.headers.get("origin") || "https://rnos.in"}/pay/${code}`;

    // Prepare custom WhatsApp message payload
    const message = `Hello ${customerName},\n\nYour application is ready.\n\nService: ${application.service_name}\nAmount: ₹${application.amount}\n\nComplete payment securely:\n${paymentLinkUrl}\n\nThank you\nDigiConnect Dukan\n\nPartner: ${ap.full_name}`;

    return NextResponse.json({
      success: true,
      code,
      url: paymentLinkUrl,
      amount: application.amount,
      expiresAt: expiresAt.toISOString(),
      whatsAppMessage: message,
    });
  } catch (error) {
    console.error("[payment-links/generate] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
