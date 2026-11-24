import { NextResponse } from "next/server";

import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import {
  approveJob,
  listStationJobs,
  rejectAndRefund,
  reprintJob,
  stationEarnings,
} from "@/lib/print/partner-jobs";
import { getStationForPartner } from "@/lib/print/stations";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * A partner's Digi Print jobs and takings.
 *
 * The station is always resolved from the session — a job id from the request
 * is only ever looked up inside that station, so one shop can never approve,
 * refund or reprint another shop's job.
 */
async function sessionStation() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isActiveAgent(user))) return null;
  const partner = await getAgencyPartnerByUserId(user.id);
  if (!partner) return null;
  const station = await getStationForPartner(partner.id);
  return station ? { user, station } : null;
}

export async function GET() {
  const context = await sessionStation();
  if (!context) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const [jobs, earnings] = await Promise.all([
    listStationJobs(context.station),
    stationEarnings(context.station),
  ]);

  return NextResponse.json(
    { jobs, earnings, agentConnected: context.station.agent_connected },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const context = await sessionStation();
  if (!context) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const limit = checkRateLimit(`ap-print-job-action:${context.user.id}`, 30, 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const body = (await request.json().catch(() => ({}))) as { jobId?: string; action?: string; reason?: string };
  const jobId = String(body.jobId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: "Job id chahiye." }, { status: 400 });

  const actor = `partner:${context.user.id}`;
  const result =
    body.action === "approve"
      ? await approveJob(context.station, jobId, actor)
      : body.action === "reprint"
        ? await reprintJob(context.station, jobId, actor)
        : body.action === "refund"
          ? await rejectAndRefund(context.station, jobId, actor, String(body.reason ?? "Shop ne cancel kiya"))
          : ({ ok: false, status: 400, error: "Unknown action." } as const);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, message: result.message });
}
