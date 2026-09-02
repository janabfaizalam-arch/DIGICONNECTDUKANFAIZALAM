import { NextResponse } from "next/server";

import { authFailureResponse, authenticateAgent, stationScope } from "@/lib/print/agent-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type UpdateStatusBody = {
  job_id?: string;
  status?: "printed" | "failed";
  error_message?: string;
};

export async function POST(request: Request) {
  try {
    const caller = await authenticateAgent(request);
    if (!caller.ok) {
      const failure = authFailureResponse(caller);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }

    const body = (await request.json().catch(() => null)) as UpdateStatusBody | null;
    const jobId = String(body?.job_id ?? "").trim();
    const status = String(body?.status ?? "").trim() as "printed" | "failed";
    const errorMessage = String(body?.error_message ?? "").trim();

    if (!jobId || (status !== "printed" && status !== "failed")) {
      return NextResponse.json({ error: "Job ID and valid status ('printed' or 'failed') are required" }, { status: 400 });
    }

    const agentId = caller.agentId;
    const scope = stationScope(caller.station);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // Build update payload dynamically
    const updatePayload: {
      print_status: "printed" | "failed";
      updated_at: string;
      claimed_by_agent?: null;
      error_message?: string;
    } = {
      print_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "failed") {
      updatePayload.claimed_by_agent = null;
      updatePayload.error_message = errorMessage || "Printing failed";
    }

    console.log(`[print/agent/update-status] Updating job ${jobId} to status "${status}"`, updatePayload);

    // Update the print job
    const { data: job, error: updateError } = await supabase
      .from("print_jobs")
      .update(updatePayload)
      .eq("id", jobId)
      // Scoped for the same reason the claim is: a shop reports on its own
      // jobs only. Marking a neighbour's job "printed" would hand a paying
      // customer an empty tray and no way to see it had gone wrong.
      .filter("station_id", scope.operator, scope.value)
      .select("id, job_number")
      .maybeSingle();

    if (updateError) {
      console.error("[print/agent/update-status] Database update error:", updateError);
      return NextResponse.json({ error: "Failed to update print job status" }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Print job not found" }, { status: 404 });
    }

    // Log the print status update
    await supabase.from("print_job_logs").insert({
      job_id: jobId,
      action: status,
      actor: `agent:${agentId}`,
      details: status === "failed" ? { error: errorMessage } : {},
    });

    return NextResponse.json({
      success: true,
      message: `Job status updated to ${status} successfully.`,
    });
  } catch (error) {
    console.error("[print/agent/update-status] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
