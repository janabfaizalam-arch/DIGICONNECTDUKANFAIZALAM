import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const jobNumber = searchParams.get("job_number");

    if (!jobId && !jobNumber) {
      return NextResponse.json({ error: "Job ID or Job Number is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    let query = supabase.from("print_jobs").select(`
      id,
      job_number,
      customer_mobile,
      copies,
      pages,
      paper_size,
      color_mode,
      price,
      payment_status,
      print_status,
      created_at
    `);

    if (jobId) {
      query = query.eq("id", jobId);
    } else {
      query = query.eq("job_number", jobNumber);
    }

    const { data: job, error } = await query.maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    // Mask customer mobile for privacy: 9876543210 -> 987****210
    const mobileStr = String(job.customer_mobile);
    const maskedMobile =
      mobileStr.length >= 6
        ? mobileStr.slice(0, 3) + "*".repeat(mobileStr.length - 6) + mobileStr.slice(-3)
        : "***";

    return NextResponse.json({
      id: job.id,
      job_number: job.job_number,
      customer_mobile: maskedMobile,
      copies: job.copies,
      pages: job.pages,
      paper_size: job.paper_size,
      color_mode: job.color_mode,
      price: job.price,
      payment_status: job.payment_status,
      print_status: job.print_status,
      created_at: job.created_at,
    });
  } catch (error) {
    console.error("[print/status] Error fetching job status:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
