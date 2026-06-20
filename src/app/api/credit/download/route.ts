// ============================================================
// Credit API Route — Stream/Download Credit Report PDF
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
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

    const isAdmin = isAdminUser(user);

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
      return NextResponse.json({ error: "Forbidden. You cannot access this credit report." }, { status: 403 });
    }

    if (!record.report_pdf_url) {
      return NextResponse.json({ error: "PDF report is not available for this check." }, { status: 404 });
    }

    // 4. Download file from private Storage bucket
    const { data: fileData, error: storageErr } = await supabase.storage
      .from("credit-reports")
      .download(record.report_pdf_url);

    if (storageErr || !fileData) {
      console.error("[credit/download] Storage error:", storageErr);
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
        "Content-Disposition": `attachment; filename="credit-report-${record.full_name.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[credit/download] Download error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
