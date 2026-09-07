import { NextResponse } from "next/server";

import { logActivity } from "@/lib/content-engine/activity";
import { CRON_ACTOR, authorizeCron } from "@/lib/content-engine/cron";
import { failureResponse } from "@/lib/content-engine/api";
import { looksGovernmental } from "@/lib/content-engine/publishing-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeScores, suggestFormat, totalScore } from "@/lib/content-engine/scoring";
import * as repo from "@/lib/content-engine/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily: notice what changed in the shop's own data.
 *
 * The one source of government truth this deployment actually has is its own
 * Labour Card scheme table, which an administrator maintains with a
 * verification date against each figure. A scheme that has just been verified
 * or corrected is a real, dated, sourced reason to post — which is exactly
 * what the mine engine is otherwise short of.
 *
 * It does not crawl the open web. A research job that fetches arbitrary pages
 * and feeds them to a model is how an unverified figure enters a system whose
 * whole point is that figures are verified, and there is no source list
 * configured here to make that safe.
 */
export async function POST(request: Request) {
  const denied = await authorizeCron(request, "daily-research");
  if (denied) return denied;

  try {
    const settings = await repo.getSettings();
    if (!settings.autoResearch) {
      return NextResponse.json({ ok: true, skipped: "AUTO_RESEARCH is off." });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });

    // Schemes verified or corrected in the last two days.
    const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("labour_schemes")
      .select("name, summary, slug, verification_status, verified_on, source_url, updated_at")
      .eq("published", true)
      .gte("updated_at", since)
      .limit(20);

    if (error) {
      // A missing or unreadable schemes table is not a failure of this job.
      return NextResponse.json({ ok: true, created: 0, note: "No scheme table to read." });
    }

    const rows = (data ?? []) as {
      name: string;
      summary: string | null;
      slug: string;
      verification_status: string;
      source_url: string | null;
    }[];

    const existing = await repo.listIdeas({ limit: 200 });
    const known = new Set(existing.map((idea) => idea.title.toLowerCase()));

    const fresh = rows
      .filter((row) => row.verification_status === "verified")
      .map((row) => `${row.name}: abhi kya milta hai aur kaun le sakta hai`)
      .filter((title) => !known.has(title.toLowerCase()));

    if (!fresh.length) return NextResponse.json({ ok: true, created: 0 });

    const scores = normalizeScores({
      hook_score: 6,
      demand_score: 8,
      // Just re-verified, which is the entire reason this is an idea today.
      freshness_score: 9,
      business_value_score: 8,
      shareability_score: 6,
    });

    const saved = await repo.insertIdeas(
      fresh.map((title, index) => ({
        title,
        description:
          `${rows[index]?.summary ?? ""} Scheme ki verification abhi update hui hai, ` +
          "to figures aaj ke hisaab se sahi hain.",
        source: "government_update" as const,
        sourceUrl: rows[index]?.source_url ?? null,
        category: "Government schemes",
        targetAudience: "Labour Card holders and their families",
        scores,
        totalScore: totalScore(scores),
        scoreReason: "A scheme figure was re-verified in the last two days, so this is dated and sourced.",
        suggestedFormat: suggestFormat(scores, true),
        status: "NEW" as const,
        government: looksGovernmental(title),
      })),
    );

    await logActivity({
      entity: "idea",
      entityId: null,
      action: "cron:daily-research",
      actor: CRON_ACTOR,
      detail: `${saved.length} ideas from recently verified schemes.`,
    });

    return NextResponse.json({ ok: true, created: saved.length });
  } catch (caught) {
    return failureResponse(caught);
  }
}

/**
 * Vercel's scheduler issues a GET.
 *
 * The work is identical; the two verbs exist because the platform's cron
 * sends GET while a manual run or another scheduler sends POST. Both go
 * through the same shared-secret check.
 */
export async function GET(request: Request) {
  return POST(request);
}
