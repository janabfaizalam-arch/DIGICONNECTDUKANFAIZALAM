import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Payment code is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    /*
      Lookup payment link.

      `profiles(full_name)` used to be embedded here and it could never work:
      payment_links.customer_id references auth.users(id), not public.profiles,
      so PostgREST has no relationship to follow and fails the whole query. The
      branch below then reported that failure as "Payment link not found", so
      every customer who opened a perfectly valid link was told it did not
      exist. The customer's name is read separately, by id — profiles.id is the
      auth user id in this schema, so one direct lookup answers it.
    */
    const { data: link, error: linkError } = await supabase
      .from("payment_links")
      .select("*, applications(service_name, status, service_slug), agency_partners(full_name)")
      .eq("code", code)
      .maybeSingle();

    if (linkError) {
      // A failed query is not a missing link. Say so, and leave a trail.
      console.error("[payment-links/details] Lookup failed:", linkError);
      return NextResponse.json(
        { error: "Could not load this payment link. Please try again." },
        { status: 500 },
      );
    }

    if (!link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }

    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", link.customer_id)
      .maybeSingle();

    const customerName = customerProfile?.full_name || "Customer";

    const now = new Date();
    const expiresAt = new Date(link.expires_at);

    if (link.status === "expired" || now > expiresAt) {
      if (link.status === "pending") {
        // Auto-update expired links
        await supabase
          .from("payment_links")
          .update({ status: "expired", updated_at: now.toISOString() })
          .eq("id", link.id);
      }
      return NextResponse.json({ error: "This payment link has expired." }, { status: 400 });
    }

    if (link.status === "cancelled") {
      return NextResponse.json({ error: "This payment link has been cancelled." }, { status: 400 });
    }

    const partnerName = (link.agency_partners as unknown as Record<string, unknown> | null)?.full_name as string | null || "DigiConnect";

    if (link.status === "paid") {
      return NextResponse.json({ 
        success: true, 
        status: "paid", 
        paidAt: link.paid_at,
        customerName,
        serviceName: link.applications?.service_name || "Service",
        partnerName,
        amount: link.amount 
      });
    }

    // Calculate GST breakdown (18%)
    const gstRate = 0.18;
    const baseAmount = Math.round((link.amount / (1 + gstRate)) * 100) / 100;
    const gstAmount = Math.round((link.amount - baseAmount) * 100) / 100;

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return NextResponse.json({
      success: true,
      status: "pending",
      code: link.code,
      amount: link.amount,
      baseAmount,
      gstAmount,
      customerName,
      serviceName: link.applications?.service_name || "Service",
      partnerName,
      applicationId: link.application_id,
      expiresAt: link.expires_at,
      remainingSeconds,
    });
  } catch (error) {
    console.error("[payment-links/details] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
