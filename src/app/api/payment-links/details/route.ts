import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/*
  Why this route reads four tables instead of one clever query.

  It used to select
    "*, applications(...), agency_partners(...), profiles(full_name)"
  and every one of those embeds was a trap:

    profiles      - payment_links.customer_id references auth.users(id), not
                    public.profiles, so PostgREST has no relationship to walk.
    applications  - there are TWO foreign keys between these tables:
                      payment_links.application_id -> applications.id
                      applications.payment_link_id -> payment_links.id
                    PostgREST refuses an embed it cannot disambiguate, and the
                    ambiguity fails the WHOLE query, not just that column.
    agency_partners - one FK today, but it rides in the same select, so it dies
                    with the rest and would break the same way the moment a
                    second FK is added.

  A failed query returns no row, and the customer was told the link did not
  exist. Every related row is now fetched by its own id in its own query: no
  relationship to resolve, nothing to disambiguate, and a later schema change
  cannot silently take the page down again. Do not reintroduce the embeds.
*/

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

    const { data: link, error: linkError } = await supabase
      .from("payment_links")
      .select("*")
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

    // A link covers a whole cart, so the services come from its cart table.
    // payment_links.application_id is only the first of them, and reading it
    // alone is what let a two-service link present itself as one service.
    const { data: cartRows } = await supabase
      .from("payment_link_applications")
      .select("application_id")
      .eq("payment_link_id", link.id);

    const applicationIds = (cartRows ?? []).map((row) => row.application_id);
    if (!applicationIds.length && link.application_id) {
      // A link written before the cart table existed.
      applicationIds.push(link.application_id);
    }

    // Names are decoration on this page: the amount, the code and the expiry
    // are what the customer pays against. A lookup that fails falls back to a
    // generic label rather than taking a working link down with it.
    const [customerResult, partnerResult, applicationsResult] = await Promise.all([
      link.customer_id
        ? supabase.from("profiles").select("full_name").eq("id", link.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      link.partner_id
        ? supabase
            .from("agency_partners")
            .select("full_name")
            .eq("id", link.partner_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      applicationIds.length
        ? supabase
            .from("applications")
            .select("id, service_name, status, service_slug, amount")
            .in("id", applicationIds)
        : Promise.resolve({ data: [] }),
    ]);

    const customerName = customerResult.data?.full_name || "Customer";
    const partnerName = partnerResult.data?.full_name || "DigiConnect";

    // Ordered as the cart was, so the page reads the way the partner built it.
    const applicationRows = applicationsResult.data ?? [];
    const applicationById = new Map(applicationRows.map((row) => [row.id, row]));
    const services = applicationIds
      .map((id) => applicationById.get(id))
      .filter(Boolean)
      .map((row) => ({
        applicationId: row!.id,
        name: row!.service_name || "Service",
        slug: row!.service_slug ?? null,
        amount: Number(row!.amount ?? 0),
      }));

    // One service keeps its own name; a cart says how many, because a single
    // name would misrepresent what is being paid for.
    const serviceName =
      services.length > 1
        ? `${services[0].name} + ${services.length - 1} more`
        : services[0]?.name || "Service";

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

    if (link.status === "paid") {
      return NextResponse.json({
        success: true,
        status: "paid",
        paidAt: link.paid_at,
        customerName,
        serviceName,
        services,
        partnerName,
        amount: link.amount,
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
      serviceName,
      services,
      // A UPI QR the customer can pay from directly. Absent when the link was
      // made before QR minting, or when minting failed -- the page falls back
      // to Razorpay Checkout, which is always available.
      upiQrImageUrl: link.razorpay_qr_image_url ?? null,
      partnerName,
      applicationId: link.application_id,
      applicationIds,
      expiresAt: link.expires_at,
      remainingSeconds,
    });
  } catch (error) {
    console.error("[payment-links/details] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
