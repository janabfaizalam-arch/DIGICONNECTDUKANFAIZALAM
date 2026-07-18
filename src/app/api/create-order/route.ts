import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRazorpayClient } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      serviceSlug?: string;
      applicationId?: string;
      amount?: number;
    };

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    let amount = Number(body.amount ?? 0);
    let applicationId = body.applicationId ?? null;
    let serviceSlug = body.serviceSlug ?? "";

    if (applicationId) {
      const { data: application } = await supabase
        .from("applications")
        .select("id, amount, fresh_payable, service_slug, user_id")
        .eq("id", applicationId)
        .maybeSingle();

      if (!application || application.user_id !== user.id) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      amount = Number(application.fresh_payable ?? application.amount ?? 0);
      serviceSlug = String(application.service_slug ?? "");
    } else if (serviceSlug) {
      const service = await getPublicServiceBySlug(serviceSlug);
      if (!service) {
        return NextResponse.json({ error: "Unknown service" }, { status: 400 });
      }
      amount = service.amount;

      const { data: created, error } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          service_id: service.id ?? null,
          service_slug: service.slug,
          service_name: service.title,
          amount: service.amount,
          fresh_payable: service.amount,
          status: "submitted",
          payment_status: "pending",
          created_by: user.id,
          submitted_by_role: "customer",
        })
        .select("id")
        .maybeSingle();

      if (error || !created) {
        return NextResponse.json({ error: error?.message ?? "Failed to create application" }, { status: 500 });
      }
      applicationId = created.id as string;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `app_${(applicationId ?? "x").slice(0, 20)}`,
      notes: {
        application_id: applicationId ?? "",
        user_id: user.id,
        service_slug: serviceSlug,
      },
    });

    await supabase.from("payments").insert({
      application_id: applicationId,
      user_id: user.id,
      amount,
      status: "created",
      razorpay_order_id: order.id,
    });

    if (applicationId) {
      await supabase
        .from("applications")
        .update({ razorpay_order_id: order.id })
        .eq("id", applicationId);
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      applicationId,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[create-order]", error);
    return NextResponse.json({ error: "Unable to create order" }, { status: 500 });
  }
}
