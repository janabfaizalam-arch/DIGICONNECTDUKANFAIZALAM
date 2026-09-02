import { NextResponse } from "next/server";

import { authenticateAgent, stationScope } from "@/lib/print/agent-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ClaimJobBody = {
  job_id?: string;
};

export async function POST(request: Request) {
  try {
    /*
      A partner's Print Station presents its own token; the platform's own
      counter presents the environment key. Either is a valid caller — but
      each is confined below to the jobs that belong to it.
    */
    const caller = await authenticateAgent(request);
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ClaimJobBody | null;
    const jobId = String(body?.job_id ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const agentId = caller.agentId;
    const scope = stationScope(caller.station);

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
    // AND (claimed_by_agent is null OR claim_expires_at < now)
    const nowStr = new Date().toISOString();
    const claimExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    console.log(`[print/agent/claim] Agent ${agentId} attempting to claim/reclaim Job ID: ${jobId}`);

    const { data: job, error: claimError } = await supabase
      .from("print_jobs")
      .update({
        print_status: "printing",
        claimed_at: nowStr,
        claimed_by: session?.id || null,
        claimed_by_agent: agentId,
        claim_expires_at: claimExpiresAt,
        updated_at: nowStr,
      })
      .eq("id", jobId)
      .eq("print_status", "queued")
      .eq("payment_status", "verified")
      .or(`claimed_by_agent.is.null,claim_expires_at.lt.${nowStr}`)
      /*
        The line that keeps two shops apart.

        A job id is guessable and, worse, was visible to any station that had
        ever listed a queue. Without this condition a shop could claim a
        neighbouring shop's job and be handed a signed URL to that customer's
        document a few lines below. The claim simply does not match rows that
        belong to somebody else, so the endpoint answers 409 exactly as it
        does for a job another agent already took.
      */
      .filter("station_id", scope.operator, scope.value)
      .select("id, job_number")
      .maybeSingle();

    if (claimError) {
      console.error("[print/agent/claim] Atomic claim database error:", claimError);
      return NextResponse.json({ error: "Failed to claim print job due to a database error" }, { status: 500 });
    }

    if (!job) {
      // Job was either already claimed, cancelled, or doesn't exist
      console.warn(`[print/agent/claim] Claim failed for Job ID: ${jobId}. Job is already claimed by another agent or is not queued.`);
      return NextResponse.json(
        { error: "Job could not be claimed. It may already be claimed or is not in the queue." },
        { status: 409 }
      );
    }

    console.log(`[print/agent/claim] Atomic lock succeeded for Job ${job.job_number} (ID: ${jobId}). claimed_by_agent: ${agentId}, expires: ${claimExpiresAt}`);

    // Claim succeeded! Now get file details and generate a secure signed URL
    const { data: file, error: fileError } = await supabase
      .from("print_job_files")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle();

    if (fileError || !file) {
      console.error("[print/agent/claim] Failed to find files for claimed job:", fileError);
      // Rollback job status to failed and clear claim metadata
      await supabase
        .from("print_jobs")
        .update({
          print_status: "failed",
          claimed_by_agent: null,
          claim_expires_at: null,
          error_message: "Job claimed, but file reference was missing on server",
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId);

      await supabase.from("print_job_logs").insert({
        job_id: jobId,
        action: "claim_failed_missing_file",
        actor: `agent:${agentId}`,
        details: {
          session_id: session?.id || null,
          agent_id: agentId,
          error: "File reference was missing"
        },
      });

      return NextResponse.json({ error: "Job claimed, but file reference was missing" }, { status: 500 });
    }

    // Generate signed URL from Supabase private storage (valid for 5 minutes / 300 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("print-jobs")
      .createSignedUrl(file.storage_path, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[print/agent/claim] Failed to generate signed URL:", signedUrlError);
      // Rollback job status to queued so it can be claimed again, and clear claim metadata
      await supabase
        .from("print_jobs")
        .update({
          print_status: "queued",
          claimed_by_agent: null,
          claim_expires_at: null,
          claimed_by: null,
          claimed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId);

      await supabase.from("print_job_logs").insert({
        job_id: jobId,
        action: "claim_failed_url_generation",
        actor: `agent:${agentId}`,
        details: {
          session_id: session?.id || null,
          agent_id: agentId,
          error: signedUrlError?.message || "Signed URL generation failed"
        },
      });

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
        claim_expires_at: claimExpiresAt,
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
