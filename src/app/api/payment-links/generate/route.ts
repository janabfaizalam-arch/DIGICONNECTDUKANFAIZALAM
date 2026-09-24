import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getPartnerMembership } from "@/lib/auth/memberships";
import { getAgencyPartnerById, getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function generatePaymentCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "APL-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

type ApplicationRow = {
  id: string;
  user_id: string;
  service_name: string | null;
  amount: number | null;
  payment_status: string | null;
  status: string | null;
  agency_partner_id: string | null;
};

/** The ids a caller asked for, in order, with duplicates and junk removed. */
function readApplicationIds(body: unknown): string[] {
  const payload = (body ?? {}) as { applicationId?: unknown; applicationIds?: unknown };
  const raw = Array.isArray(payload.applicationIds)
    ? payload.applicationIds
    : [payload.applicationId];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of raw) {
    if (typeof value === "string" && value && !seen.has(value)) {
      seen.add(value);
      ids.push(value);
    }
  }
  return ids;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const membership = await getPartnerMembership(user.id);
    const ap =
      (membership.ok ? await getAgencyPartnerById(membership.partnerId) : null) ??
      (await getAgencyPartnerByUserId(user.id));

    if (!ap) {
      return NextResponse.json({ error: "DC Partner profile not found." }, { status: 403 });
    }

    if (!membership.ok || ap.status !== "active") {
      return NextResponse.json(
        {
          error:
            membership.reason === "kyc_not_approved"
              ? "Your KYC approval is pending."
              : membership.reason === "ap_not_active"
                ? "Your DC Partner account is inactive."
                : "DC Partner profile is not active.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { expiryHours = 24 } = body ?? {};

    /*
      One link covers a whole cart.

      A wizard run with two services creates two applications, and this route
      used to take a single id -- so the link charged for the first service
      while the partner was shown the cart total and the customer underpaid.
      `applicationIds` is the cart; `applicationId` is still accepted for a
      single application.
    */
    const applicationIds = readApplicationIds(body);
    if (!applicationIds.length) {
      return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    const { data: applicationRows, error: appError } = await supabase
      .from("applications")
      .select("id, user_id, service_name, amount, payment_status, status, agency_partner_id")
      .in("id", applicationIds);

    if (appError) {
      console.error("[payment-links/generate] Application lookup failed:", appError);
      return NextResponse.json({ error: "Could not load the applications." }, { status: 500 });
    }

    const byId = new Map((applicationRows as ApplicationRow[] | null ?? []).map((row) => [row.id, row]));
    // Keep the caller's order: the first application is the link's primary one.
    const applications = applicationIds.map((id) => byId.get(id)).filter(Boolean) as ApplicationRow[];

    if (applications.length !== applicationIds.length) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Ownership: each application is the partner's own, or a team member's
    // whose account they created. One lookup per distinct partner, not per
    // application.
    const foreignPartnerIds = [
      ...new Set(
        applications
          .map((application) => application.agency_partner_id)
          .filter((id): id is string => Boolean(id) && id !== ap.id),
      ),
    ];

    if (foreignPartnerIds.length) {
      const { data: teamRows } = await supabase
        .from("agency_partners")
        .select("id")
        .in("id", foreignPartnerIds)
        .eq("created_by_user_id", user.id);

      const allowed = new Set((teamRows ?? []).map((row) => row.id));
      if (foreignPartnerIds.some((id) => !allowed.has(id))) {
        return NextResponse.json({ error: "Access denied to this application." }, { status: 403 });
      }
    }

    if (applications.some((application) => !application.agency_partner_id)) {
      return NextResponse.json({ error: "Access denied to this application." }, { status: 403 });
    }

    if (applications.some((application) => application.payment_status === "verified")) {
      return NextResponse.json({ error: "Application is already paid." }, { status: 400 });
    }

    // A cart belongs to one customer; a link has one customer_id.
    const customerIds = new Set(applications.map((application) => application.user_id));
    if (customerIds.size > 1) {
      return NextResponse.json(
        { error: "These applications belong to different customers. Generate one link each." },
        { status: 400 },
      );
    }

    const primary = applications[0];
    const totalAmount = applications.reduce(
      (sum, application) => sum + Number(application.amount ?? 0),
      0,
    );

    /*
      Pressing Generate twice should give the same link, not an error. A link
      that is still live is handed back as-is; a dead one is replaced in place,
      so an application never accumulates stale links.
    */
    const { data: existingCartRows } = await supabase
      .from("payment_link_applications")
      .select("payment_link_id")
      .in("application_id", applicationIds);

    const existingLinkIds = [...new Set((existingCartRows ?? []).map((row) => row.payment_link_id))];

    const { data: existingLinks } = existingLinkIds.length
      ? await supabase
          .from("payment_links")
          .select("id, code, status, expires_at")
          .in("id", existingLinkIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const links = existingLinks ?? [];

    if (links.some((link) => link.status === "paid")) {
      return NextResponse.json({ error: "Application is already paid." }, { status: 400 });
    }

    const now = new Date();
    const liveLink = links.find(
      (link) => link.status === "pending" && new Date(link.expires_at) > now,
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const { data: customer } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", primary.user_id)
      .maybeSingle();

    const customerName = customer?.full_name || "Customer";

    let code: string;

    if (liveLink) {
      code = liveLink.code;
      expiresAt.setTime(new Date(liveLink.expires_at).getTime());
    } else {
      code = generatePaymentCode();
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
        return NextResponse.json(
          { error: "Failed to generate unique code. Please try again." },
          { status: 500 },
        );
      }

      const row = {
        code,
        application_id: primary.id,
        partner_id: ap.id,
        customer_id: primary.user_id,
        amount: totalAmount,
        status: "pending" as const,
        expires_at: expiresAt.toISOString(),
        paid_at: null,
        updated_at: new Date().toISOString(),
      };

      const reusable = links[0];
      const { data: written, error: writeError } = reusable
        ? await supabase.from("payment_links").update(row).eq("id", reusable.id).select("id").maybeSingle()
        : await supabase.from("payment_links").insert(row).select("id").maybeSingle();

      if (writeError || !written) {
        console.error("[payment-links/generate] Write error:", writeError);
        return NextResponse.json({ error: "Failed to save payment link details." }, { status: 500 });
      }

      // Replacing a link replaces its cart too, so a re-generated link never
      // carries an application the partner has since dropped.
      if (reusable) {
        await supabase.from("payment_link_applications").delete().eq("payment_link_id", written.id);
      }

      const { error: cartError } = await supabase.from("payment_link_applications").insert(
        applications.map((application) => ({
          payment_link_id: written.id,
          application_id: application.id,
        })),
      );

      if (cartError) {
        console.error("[payment-links/generate] Cart write error:", cartError);
        return NextResponse.json({ error: "Failed to save payment link details." }, { status: 500 });
      }
    }

    const paymentLinkUrl = `${request.headers.get("origin") || "https://rnos.in"}/pay/${code}`;

    const serviceLines = applications
      .map((application) => application.service_name || "Service")
      .join(", ");

    const message = `Hello ${customerName},\n\nYour application is ready.\n\nService: ${serviceLines}\nAmount: ₹${totalAmount}\n\nComplete payment securely:\n${paymentLinkUrl}\n\nThank you\nDigiConnect Dukan\n\nPartner: ${ap.full_name}`;

    return NextResponse.json({
      success: true,
      code,
      url: paymentLinkUrl,
      amount: totalAmount,
      applicationIds: applications.map((application) => application.id),
      expiresAt: expiresAt.toISOString(),
      whatsAppMessage: message,
    });
  } catch (error) {
    console.error("[payment-links/generate] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
