import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ReprintBody = {
  job_id?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const isAdmin = isAdminUser(user);

    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ReprintBody | null;
    const jobId = String(body?.job_id ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // Fetch print job details
    const { data: job, error: jobError } = await supabase
      .from("print_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      console.error("[print/reprint] Error finding job:", jobError);
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    // Verify if print job file still exists (files expire after 24h)
    const { data: file, error: fileError } = await supabase
      .from("print_job_files")
      .select("id")
      .eq("job_id", jobId)
      .maybeSingle();

    if (fileError || !file) {
      return NextResponse.json(
        { error: "Cannot reprint. The file has already been deleted (expired after 24 hours)." },
        { status: 400 }
      );
    }

    // Reset job status to queued, clear claims
    const { error: updateError } = await supabase
      .from("print_jobs")
      .update({
        print_status: "queued",
        claimed_by: null,
        claimed_at: null,
        claimed_by_agent: null,
        claim_expires_at: null,
        error_message: null,
        printer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("[print/reprint] Error resetting job status:", updateError);
      return NextResponse.json({ error: "Failed to reset print job status" }, { status: 500 });
    }

    // Log the reprint action
    await supabase.from("print_job_logs").insert({
      job_id: jobId,
      action: "reprint_requested",
      actor: `admin:${user.email}`,
      details: {
        admin_id: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Print job has been queued for reprint successfully.",
    });
  } catch (error) {
    console.error("[print/reprint] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
