import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { processCrmSyncQueue } from "@/lib/crmSync";
import { isGoogleSheetsConfigured } from "@/lib/google";
import { retryCrmSyncJob } from "@/lib/syncQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: Request): Promise<boolean> | boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const syncSecret = process.env.CRM_SYNC_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (cronSecret && bearer === cronSecret) return true;
  if (syncSecret && bearer === syncSecret) return true;
  if (syncSecret && request.headers.get("x-crm-sync-secret") === syncSecret) return true;

  return false;
}

/**
 * Background CRM sync processor.
 * Auth: CRON_SECRET / CRM_SYNC_SECRET bearer, or admin session.
 */
export async function POST(request: Request) {
  const secretOk = authorize(request);
  if (!secretOk) {
    const user = await getCurrentUser();
    if (!user || !isAdminRole(await getCurrentUserRole(user))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google Sheets is not configured",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: { limit?: number; retryJobId?: string } = {};
  try {
    body = (await request.json()) as { limit?: number; retryJobId?: string };
  } catch {
    body = {};
  }

  if (body.retryJobId) {
    const retried = await retryCrmSyncJob(body.retryJobId);
    if (!retried.ok) {
      return NextResponse.json({ ok: false, error: retried.error }, { status: 400 });
    }
  }

  const result = await processCrmSyncQueue({ limit: body.limit ?? 15 });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  const secretOk = authorize(request);
  if (!secretOk) {
    const user = await getCurrentUser();
    if (!user || !isAdminRole(await getCurrentUserRole(user))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await processCrmSyncQueue({ limit: 15 });
  return NextResponse.json({
    ok: true,
    configured: isGoogleSheetsConfigured(),
    ...result,
  });
}
