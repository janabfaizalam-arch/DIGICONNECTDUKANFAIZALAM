import { NextResponse } from "next/server";

import { authFailureResponse, authenticateAgent, stationScope } from "@/lib/print/agent-auth";
import { purgeExpiredStationFiles } from "@/lib/print/partner-jobs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const serverLogs: string[] = [];
  const addLog = (msg: string, isError = false) => {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}`;
    serverLogs.push(formattedMsg);
    if (isError) {
      console.error(formattedMsg);
    } else {
      console.log(formattedMsg);
    }
  };

  try {
    addLog("[print/agent/jobs] Received GET request");

    /*
      Two kinds of caller, resolved in one place.

      A partner's Print Station presents the token issued to that shop and
      gets only that shop's jobs. The platform's own counter presents the
      single environment key it always has, so the existing installation keeps
      working while shops are onboarded one at a time. Claiming and reporting
      ask the same question the same way — see src/lib/print/agent-auth.ts.
    */
    const caller = await authenticateAgent(request);
    if (!caller.ok) {
      const failure = authFailureResponse(caller);
      addLog(
        caller.reason === "unavailable"
          ? "Supabase service-role configuration is missing, so no token could be checked."
          : "Unauthorized request: neither a known station token nor the platform key.",
        true,
      );
      return NextResponse.json({ error: failure.error, serverLogs }, { status: failure.status });
    }

    const station = caller.station;

    const { searchParams } = new URL(request.url);
    const agentId = caller.agentId;
    const ipAddress = getClientIp(request);
    const scope = stationScope(station);
    addLog(`Agent authenticated: ID="${agentId}", IP="${ipAddress}"`);

    // 3. Initialize Supabase Client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      // Logged here, never sent: an agent's screen is not where the
      // server's own configuration belongs.
      addLog("Supabase Admin client initialization failed.", true);
      return NextResponse.json(
        { error: "The server is not configured to read print jobs right now.", serverLogs },
        { status: 500 }
      );
    }

    // 4. Manage/Register the agent session safely
    const sessionToken = request.headers.get("x-session-token") || "session-token";
    try {
      addLog(`Checking session status for agent_id="${agentId}"`);
      const { data: existingSession, error: checkSessionError } = await supabase
        .from("print_agent_sessions")
        .select("id")
        .eq("agent_id", agentId)
        .maybeSingle();

      if (checkSessionError) {
        addLog(`Database error checking agent session: ${checkSessionError.message} (Code: ${checkSessionError.code})`, true);
      } else {
        let sessionError = null;
        if (existingSession?.id) {
          addLog(`Updating existing session ID: ${existingSession.id}`);
          const { error: updateError } = await supabase
            .from("print_agent_sessions")
            .update({
              token: sessionToken,
              ip_address: ipAddress,
              status: "active",
              last_active_at: new Date().toISOString(),
            })
            .eq("id", existingSession.id);
          sessionError = updateError;
        } else {
          addLog(`Creating new session for agent_id="${agentId}"`);
          const { error: insertError } = await supabase
            .from("print_agent_sessions")
            .insert({
              agent_id: agentId,
              token: sessionToken,
              ip_address: ipAddress,
              status: "active",
              last_active_at: new Date().toISOString(),
            });
          sessionError = insertError;
        }

        if (sessionError) {
          addLog(`Database error upserting agent session: ${sessionError.message} (Code: ${sessionError.code})`, true);
        } else {
          addLog(`Agent session successfully registered/updated.`);
        }
      }
    } catch (sessionErr) {
      addLog(`Unexpected exception during agent session registration: ${sessionErr instanceof Error ? sessionErr.message : String(sessionErr)}`, true);
    }

    // 5. Register/Update printers sent by the agent
    /*
      The platform's own printer table is for the platform's own counter.

      A partner's PC reports its printers too, and they used to land here —
      every shop's printers mixed into one global list, by name. A station's
      list is stored on its own row instead (see touchAgent), where the
      partner panel reads it to offer a printer dropdown.
    */
    const printersParam = station ? null : searchParams.get("printers"); // Comma-separated printer names
    if (printersParam) {
      try {
        const printerNames = printersParam.split(",").map((p) => p.trim()).filter(Boolean);
        addLog(`Registering physical printers: ${JSON.stringify(printerNames)}`);
        for (const printerName of printerNames) {
          const { data: existingPrinter, error: checkPrinterError } = await supabase
            .from("print_printers")
            .select("id")
            .eq("name", printerName)
            .maybeSingle();

          if (checkPrinterError) {
            addLog(`Database error checking printer "${printerName}": ${checkPrinterError.message} (Code: ${checkPrinterError.code})`, true);
            continue;
          }

          let printerError = null;
          if (existingPrinter?.id) {
            const { error: updateError } = await supabase
              .from("print_printers")
              .update({
                status: "online",
                last_seen_at: new Date().toISOString(),
              })
              .eq("id", existingPrinter.id);
            printerError = updateError;
          } else {
            const { error: insertError } = await supabase
              .from("print_printers")
              .insert({
                name: printerName,
                display_name: printerName,
                status: "online",
                last_seen_at: new Date().toISOString(),
              });
            printerError = insertError;
          }

          if (printerError) {
            addLog(`Database error upserting printer "${printerName}": ${printerError.message} (Code: ${printerError.code})`, true);
          }
        }
        addLog("Printer registration completed.");
      } catch (printerErr) {
        addLog(`Unexpected exception during printer registration: ${printerErr instanceof Error ? printerErr.message : String(printerErr)}`, true);
      }
    }

    // 6. Fetch queued, paid print jobs with their files
    addLog("Fetching queued, paid print jobs...");
    const now = new Date().toISOString();
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
        claimed_by_agent,
        claim_expires_at,
        print_job_files (
          id,
          file_name,
          file_size,
          mime_type
        )
      `)
      /*
        Queued jobs, and jobs a printer claimed and then went silent on.

        A claim moves the job to "printing". If the PC was switched off or
        the program crashed between claiming and reporting, the job used to
        sit at "printing" forever — paid for, never printed, invisible to
        every later poll. Once its claim expires it is offered again.
      */
      .or(`print_status.eq.queued,and(print_status.eq.printing,claim_expires_at.lt.${now})`)
      .eq("payment_status", "verified")
      .or(`claimed_by_agent.is.null,claim_expires_at.lt.${now}`)
      /*
        A shop's Print Station sees only that shop's jobs.

        This is the line that keeps two partners on one platform apart: with
        it missing, any station token would pull down every other shop's
        customers' documents. The platform's own counter — authenticated by
        the environment key rather than a station token — takes the jobs that
        belong to no station, which is every job that existed before this.
      */
      .filter("station_id", scope.operator, scope.value)
      .order("created_at", { ascending: true });

    if (jobsError) {
      addLog(`Database error querying print jobs: ${jobsError.message} (Code: ${jobsError.code})`, true);
      return NextResponse.json(
        { 
          error: "Failed to query print jobs due to a database error", 
          serverLogs,
        },
        { status: 500 }
      );
    }

    // Keep the customer's promise: finished jobs lose their file once the
    // station's auto-delete window passes. Never allowed to fail the poll.
    if (station) {
      await purgeExpiredStationFiles(station.id).catch(() => 0);
    }

    const jobCount = jobs ? jobs.length : 0;
    addLog(`Successfully retrieved ${jobCount} jobs.`);

    return NextResponse.json({
      jobs: jobs || [],
      /*
        Which counter this agent is connected to.

        The desktop program shows it on the shop's own screen, so a partner
        who has just pasted a key can see it landed on their station and not
        on somebody else's. Only the name and code — never the rates, the
        takings, or the token.
      */
      station: station
        ? {
            code: station.code,
            display_name: station.display_name,
            // Chosen by the partner in the panel. The PC uses them when it
            // has a printer by that name, and its own choice otherwise.
            printer_name: station.printer_name,
            color_printer_name: station.color_printer_name,
          }
        : null,
      serverLogs,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    addLog(`Fatal unexpected exception: ${errorMsg}`, true);
    return NextResponse.json(
      { 
        error: "An unexpected error occurred on the server",
        serverLogs,
      },
      { status: 500 }
    );
  }
}
