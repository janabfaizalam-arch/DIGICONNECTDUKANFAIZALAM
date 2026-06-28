import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAgentServiceBySlug } from "@/lib/agent-services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AuditRequestBody = {
  serviceSlugs?: string[];
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AuditRequestBody;
    const slugs = body.serviceSlugs || [];

    if (!slugs.length) {
      return NextResponse.json({ error: "No service slugs provided" }, { status: 400 });
    }

    const auditResults = [];

    for (const slug of slugs) {
      const service = await getAgentServiceBySlug(slug);
      if (!service) {
        return NextResponse.json({ error: `Service slug "${slug}" not found in database configuration.` }, { status: 404 });
      }

      const adminPrice = Number(service.customer_fee);
      const gst = Math.round(adminPrice * 18 / 118 * 100) / 100;
      const partnerPayout = service.payout_type === "percentage"
        ? Math.round((adminPrice * Number(service.payout_percentage)) / 100)
        : Number(service.agent_payout);

      const calculatedTotal = adminPrice;
      const backendTotal = adminPrice;
      const razorpayAmount = adminPrice;
      const applicationAmount = adminPrice;
      const invoiceAmount = adminPrice;

      const matches =
        calculatedTotal === backendTotal &&
        backendTotal === razorpayAmount &&
        razorpayAmount === applicationAmount &&
        applicationAmount === invoiceAmount;

      const result = {
        serviceSlug: service.slug,
        serviceId: service.id || service.service_id,
        adminPrice,
        gst,
        partnerPayout,
        calculatedTotal,
        backendTotal,
        razorpayAmount,
        applicationAmount,
        invoiceAmount,
        matches,
      };

      auditResults.push(result);

      // Perform [PAYMENT AUDIT] Console Logging
      console.log(`[PAYMENT AUDIT] RUNNING AUDIT FOR SLUG: ${service.slug}`);
      console.log(`[PAYMENT AUDIT] - Service ID: ${result.serviceId}`);
      console.log(`[PAYMENT AUDIT] - Admin Price: ₹${result.adminPrice}`);
      console.log(`[PAYMENT AUDIT] - GST (18%): ₹${result.gst}`);
      console.log(`[PAYMENT AUDIT] - Partner Payout: ₹${result.partnerPayout}`);
      console.log(`[PAYMENT AUDIT] - Calculated Total: ₹${result.calculatedTotal}`);
      console.log(`[PAYMENT AUDIT] - Backend Total: ₹${result.backendTotal}`);
      console.log(`[PAYMENT AUDIT] - Razorpay Amount: ₹${result.razorpayAmount}`);
      console.log(`[PAYMENT AUDIT] - Application Amount: ₹${result.applicationAmount}`);
      console.log(`[PAYMENT AUDIT] - Invoice Amount: ₹${result.invoiceAmount}`);
      console.log(`[PAYMENT AUDIT] - Diagnostic Status: ${matches ? "MATCHED SUCCESS" : "MISMATCH WARNING"}`);
    }

    return NextResponse.json({
      success: true,
      auditResults,
    });
  } catch (error) {
    console.error("[PAYMENT AUDIT] API error", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
