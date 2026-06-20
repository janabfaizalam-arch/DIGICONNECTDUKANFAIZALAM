// ============================================================
// Credit API Route — Retrieve Single Credit Report
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSignedReportUrl } from "@/lib/credit/client";
import { sanitizePanForLog } from "@/lib/credit/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Credit report ID is required" }, { status: 400 });
    }

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = isAdminUser(user);

    // 2. Fetch credit report record
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 });
    }

    const { data: record, error: dbErr } = await supabase
      .from("credit_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (dbErr || !record) {
      return NextResponse.json({ error: "Credit report not found" }, { status: 404 });
    }

    // 3. Authorization check
    if (!isAdmin && record.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden. You cannot access this credit report." }, { status: 403 });
    }

    // 4. Generate signed PDF URL on demand if PDF exists
    let signedPdfUrl: string | null = null;
    if (record.report_pdf_url) {
      try {
        signedPdfUrl = await getSignedReportUrl(record.report_pdf_url);
      } catch (err) {
        console.error("Failed to generate signed PDF URL:", err);
      }
    }

    // 5. Mask PAN for admin viewing (comply with security rules)
    const sanitizedRecord = {
      ...record,
      pan: isAdmin ? sanitizePanForLog(record.pan) : record.pan,
      report_pdf_url: signedPdfUrl, // Send the temporary signed URL instead of storage path
    };

    return NextResponse.json({
      success: true,
      report: sanitizedRecord,
    });
  } catch (error) {
    console.error("[credit/report] Fetch error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
