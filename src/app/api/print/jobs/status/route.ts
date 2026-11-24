import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = String(searchParams.get("job_id") ?? "").trim();

    /*
      By job id only.

      Job numbers are sequential (PJ-101, PJ-102…), so a lookup by number let
      anybody walk every order on the platform. The id is a random UUID that
      only the customer's own screen holds.
    */
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    let query = supabase.from("print_jobs").select(`
      id,
      job_number,
      copies,
      pages,
      paper_size,
      color_mode,
      price,
      payment_status,
      print_status,
      created_at
    `);

    query = query.eq("id", jobId);

    const { data: job, error } = await query.maybeSingle();

    if (error || !job) {
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      job_number: job.job_number,
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
