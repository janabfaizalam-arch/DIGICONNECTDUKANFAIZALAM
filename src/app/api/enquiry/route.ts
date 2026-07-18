import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimitDurable } from "@/lib/rate-limit-durable";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitDurable(`enquiry:${ip}`, 8, 60_000);
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let name = "";
    let mobile = "";
    let email = "";
    let service = "";
    let message = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      name = String(body.name ?? "").trim();
      mobile = String(body.mobile ?? "").trim();
      email = String(body.email ?? "").trim();
      service = String(body.service ?? "").trim();
      message = String(body.message ?? "").trim();
    } else {
      const formData = await request.formData();
      name = String(formData.get("name") ?? "").trim();
      mobile = String(formData.get("mobile") ?? "").trim();
      email = String(formData.get("email") ?? "").trim();
      service = String(formData.get("service") ?? "").trim();
      message = String(formData.get("message") ?? "").trim();
    }

    if (!name || !mobile) {
      return NextResponse.json({ error: "Name and mobile are required." }, { status: 400 });
    }

    const { error } = await supabase.from("enquiries").insert({
      name,
      mobile,
      email,
      service,
      message,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL("/contact?sent=1", request.url), 303);
  } catch {
    return NextResponse.json({ error: "Unable to submit enquiry." }, { status: 500 });
  }
}
