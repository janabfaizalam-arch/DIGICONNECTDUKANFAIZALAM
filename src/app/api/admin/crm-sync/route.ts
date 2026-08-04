import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { scheduleCrmSync } from "@/lib/crmSync";
import { backfillCrmApplications, parseBackfillCursor } from "@/lib/crmBackfill";
import { isGoogleSheetsConfigured, loadGoogleSheetsConfig } from "@/lib/google";
import {
  getCrmSyncSummary,
  listCrmSyncJobs,
  processCrmSyncQueue,
  retryCrmSyncJob,
} from "@/lib/syncQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isAdminRole(await getCurrentUserRole(user))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [jobs, summary] = await Promise.all([listCrmSyncJobs(150), getCrmSyncSummary()]);
  const config = loadGoogleSheetsConfig();

  return NextResponse.json({
    ok: true,
    configured: isGoogleSheetsConfigured(),
    spreadsheetConfigured: config.ok,
    summary,
    jobs,
  });
}

const postSchema = z.object({
  action: z.enum(["retry", "process", "resync", "backfill"]),
  jobId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: z.string().optional(),
  skipMapped: z.boolean().optional(),
  processAfterEnqueue: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "retry") {
    if (!body.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
    const retried = await retryCrmSyncJob(body.jobId);
    if (!retried.ok) return NextResponse.json({ error: retried.error }, { status: 400 });
    const result = await processCrmSyncQueue({ limit: 5 });
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "resync") {
    if (!body.applicationId) {
      return NextResponse.json({ error: "applicationId required" }, { status: 400 });
    }
    scheduleCrmSync(body.applicationId, "full_resync");
    return NextResponse.json({ ok: true, scheduled: true, applicationId: body.applicationId });
  }

  if (body.action === "backfill") {
    const { cursorCreatedAt, cursorId } = parseBackfillCursor(body.cursor);
    const result = await backfillCrmApplications({
      limit: body.limit ?? 100,
      cursorCreatedAt,
      cursorId,
      skipMapped: body.skipMapped !== false,
      processAfterEnqueue: body.processAfterEnqueue === true,
      processLimit: 25,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = await processCrmSyncQueue({ limit: body.limit ?? 15 });
  return NextResponse.json({ ok: true, ...result });
}
