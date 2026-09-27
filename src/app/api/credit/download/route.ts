// ============================================================
// Credit API Route — Stream/Download Credit Report PDF
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

    const isAdmin = await hasAdminAccess(user);

    // 2. Fetch record
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
      // Same answer as a missing report: whether someone else's report exists
      // is not something to confirm.
      return NextResponse.json({ error: "Credit report not found" }, { status: 404 });
    }

    if (!record.report_pdf_url) {
      return NextResponse.json({ error: "PDF report is not available for this check." }, { status: 404 });
    }

    // 4. Download file from private Storage bucket
    const { data: fileData, error: storageErr } = await supabase.storage
      .from("credit-reports")
      .download(record.report_pdf_url);

    if (storageErr || !fileData) {
      console.error("[credit/download] storage_error", { reportId: record.id, message: storageErr?.message });
      return NextResponse.json({ error: "Failed to retrieve report PDF from storage." }, { status: 500 });
    }

    // 5. Stream the PDF back to client
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Insert download audit log
    await supabase.from("credit_audit_logs").insert({
      credit_report_id: record.id,
      user_id: user.id,
      action: "download_pdf",
      details: {
        downloaded_by: user.email,
        ip_address: request.headers.get("x-forwarded-for") || null,
        user_agent: request.headers.get("user-agent") || null,
      },
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        // ASCII-only and quote-free: a name with a quote, a newline or
        // Devanagari in it must not be able to break the header.
        "Content-Disposition": `attachment; filename="credit-report-${
          String(record.full_name ?? "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "report"
        }.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[credit/download] failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
