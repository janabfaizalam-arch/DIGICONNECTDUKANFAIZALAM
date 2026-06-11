import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const agentId = request.headers.get("x-agent-id") || searchParams.get("agent_id") || "default-agent";
    const ipAddress = getClientIp(request);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // 1. Manage/Register the agent session
    const sessionToken = request.headers.get("x-session-token") || "session-token";
    const { error: sessionError } = await supabase
      .from("print_agent_sessions")
      .upsert(
        {
          agent_id: agentId,
          token: sessionToken,
          ip_address: ipAddress,
          status: "active",
          last_active_at: new Date().toISOString(),
        },
        {
          onConflict: "agent_id", // We upsert per agent_id to keep sessions clean
        }
      )
      .select("id")
      .single();

    if (sessionError) {
      console.warn("[print/agent/jobs] Session upsert warning:", sessionError);
    }

    // 2. Register/Update printers sent by the agent
    const printersParam = searchParams.get("printers"); // Comma-separated printer names
    if (printersParam) {
      const printerNames = printersParam.split(",").map((p) => p.trim()).filter(Boolean);
      for (const printerName of printerNames) {
        await supabase
          .from("print_printers")
          .upsert(
            {
              name: printerName,
              display_name: printerName,
              status: "online",
              last_seen_at: new Date().toISOString(),
            },
            {
              onConflict: "name",
            }
          );
      }
    }

    // 3. Fetch queued, paid print jobs with their files
    const { data: jobs, error: jobsError } = await supabase
      .from("print_jobs")
      .select(`
        id,
        job_number,
        copies,
        pages,
        paper_size,
        color_mode,
        price,
        created_at,
        print_job_files (
          id,
          file_name,
          file_size,
          mime_type
        )
      `)
      .eq("print_status", "queued")
      .eq("payment_status", "verified")
      .order("created_at", { ascending: true });

    if (jobsError) {
      console.error("[print/agent/jobs] Error loading print jobs:", jobsError);
      return NextResponse.json({ error: "Failed to query print jobs" }, { status: 500 });
    }

    return NextResponse.json({
      jobs: jobs || [],
    });
  } catch (error) {
    console.error("[print/agent/jobs] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
