import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ClaimJobBody = {
  job_id?: string;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secretKey = process.env.PRINT_AGENT_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "PRINT_AGENT_SECRET_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ClaimJobBody | null;
    const jobId = String(body?.job_id ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const agentId = request.headers.get("x-agent-id") || "default-agent";

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // Find the session ID for this agent
    const { data: session } = await supabase
      .from("print_agent_sessions")
      .select("id")
      .eq("agent_id", agentId)
      .eq("status", "active")
      .order("last_active_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Perform atomic lock by updating status only if it is currently 'queued' and payment is 'verified'
    const { data: job, error: claimError } = await supabase
      .from("print_jobs")
      .update({
        print_status: "printing",
        claimed_at: new Date().toISOString(),
        claimed_by: session?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("print_status", "queued")
      .eq("payment_status", "verified")
      .select("id, job_number")
      .maybeSingle();

    if (claimError) {
      console.error("[print/agent/claim] Atomic claim database error:", claimError);
      return NextResponse.json({ error: "Failed to claim print job due to a database error" }, { status: 500 });
    }

    if (!job) {
      // Job was either already claimed, cancelled, or doesn't exist
      return NextResponse.json(
        { error: "Job could not be claimed. It may already be claimed or is not in the queue." },
        { status: 409 }
      );
    }

    // Claim succeeded! Now get file details and generate a secure signed URL
    const { data: file, error: fileError } = await supabase
      .from("print_job_files")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle();

    if (fileError || !file) {
      console.error("[print/agent/claim] Failed to find files for claimed job:", fileError);
      // Rollback job status to queued so someone else can claim it, or mark failed
      await supabase
        .from("print_jobs")
        .update({ print_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return NextResponse.json({ error: "Job claimed, but file reference was missing" }, { status: 500 });
    }

    // Generate signed URL from Supabase private storage (valid for 5 minutes / 300 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("print-jobs")
      .createSignedUrl(file.storage_path, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[print/agent/claim] Failed to generate signed URL:", signedUrlError);
      // Rollback job status
      await supabase
        .from("print_jobs")
        .update({ print_status: "queued", updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return NextResponse.json({ error: "Failed to generate download URL for the private file" }, { status: 500 });
    }

    // Insert log
    await supabase.from("print_job_logs").insert({
      job_id: jobId,
      action: "claimed",
      actor: `agent:${agentId}`,
      details: {
        session_id: session?.id || null,
        agent_id: agentId,
      },
    });

    return NextResponse.json({
      success: true,
      job_number: job.job_number,
      file: {
        file_name: file.file_name,
        file_size: file.file_size,
        mime_type: file.mime_type,
        download_url: signedUrlData.signedUrl,
      },
    });
  } catch (error) {
    console.error("[print/agent/claim] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
