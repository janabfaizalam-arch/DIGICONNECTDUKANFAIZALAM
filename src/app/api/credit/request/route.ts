// ============================================================
// Credit API Route — Request/Retry Credit Score Check
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { processCreditScoreCheck } from "@/lib/credit/client";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`credit-request-retry:${ip}`, 5, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please login." }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    const creditReportId = String(body?.credit_report_id ?? "").trim();

    if (!creditReportId) {
      return NextResponse.json({ error: "Credit report ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 });
    }

    // 3. Retrieve and validate request ownership
    const selectPayload = { id: creditReportId, customer_id: user.id };
    const { data: record, error: dbErr } = await supabase
      .from("credit_reports")
      .select("*")
      .eq("id", creditReportId)
      .eq("customer_id", user.id)
      .single();

    if (dbErr || !record) {
      console.error({
        error: dbErr,
        table: "credit_reports",
        payload: selectPayload,
      });
      return NextResponse.json({
        error: `Credit report request not found: ${dbErr?.message || "Not found or unauthorized"}`
      }, { status: 404 });
    }

    // Check payment is verified
    if (record.status !== "payment_verified" && record.status !== "failed" && record.status !== "processing") {
      return NextResponse.json({
        error: "Report is not in a payable or retryable state. Payment verification required first.",
      }, { status: 400 });
    }

    // 4. Trigger / re-trigger check
    const scoreResult = await processCreditScoreCheck(record.id, user.id);

    return NextResponse.json({
      success: true,
      result: scoreResult,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[credit/request] Credit check request failed:", err);
    return NextResponse.json({ error: err.message || "Failed to process credit check request." }, { status: 500 });
  }
}
