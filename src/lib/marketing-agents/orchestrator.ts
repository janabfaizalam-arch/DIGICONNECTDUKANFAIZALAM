import "server-only";

import { revalidatePath } from "next/cache";

import { configuredPlatforms, redact, resolveMarketingAgentsMode } from "@/lib/marketing-agents/config";
import { campaignName, indiaDate, slugify, trackedUrl } from "@/lib/marketing-agents/links";
import { pickServiceForToday } from "@/lib/marketing-agents/pick-service";
import { runPostAgent, runPosterAgent } from "@/lib/marketing-agents/post-agent";
import { runPromptAgent } from "@/lib/marketing-agents/prompt-agent";
import { preparePosts, runPublishAgent } from "@/lib/marketing-agents/publish-agent";
import type { PublishResult } from "@/lib/marketing-agents/publishers/types";
import { runResearchAgent } from "@/lib/marketing-agents/research-agent";
import { getPublicFeaturedServices, getPublicServices } from "@/lib/services";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Runs the four agents in order for one service and records every step.
 *
 *   Research → Prompt → Post (+ poster + blog article) → Publish
 *
 * Every stage writes its output to `marketing_agent_runs` as it finishes, so
 * a run that dies halfway still shows how far it got and why.
 */

const TABLE = "marketing_agent_runs";
const BUCKET = "marketing-posts";

export type RunOutcome =
  | { ok: true; runId: string; status: "completed" | "partial" | "failed"; service: string; results: PublishResult[] }
  | { ok: false; skipped: string };

export async function runMarketingAgents(input: {
  trigger: "cron" | "manual";
  /** Manual runs choose; cron runs follow MARKETING_AGENTS_MODE. */
  requestedMode?: "draft" | "live";
  serviceSlug?: string;
  userId?: string | null;
}): Promise<RunOutcome> {
  const envMode = resolveMarketingAgentsMode();
  let mode: "draft" | "live";
  if (input.trigger === "cron") {
    if (envMode === "disabled") return { ok: false, skipped: "MARKETING_AGENTS_MODE is disabled." };
    mode = envMode;
  } else {
    // A manual draft is always allowed; posting publicly needs live mode switched on.
    mode = input.requestedMode === "live" ? "live" : "draft";
    if (mode === "live" && envMode !== "live") {
      return { ok: false, skipped: "Set MARKETING_AGENTS_MODE=live before posting publicly." };
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, skipped: "Supabase service role is not configured." };
  if (!process.env.GEMINI_API_KEY) return { ok: false, skipped: "GEMINI_API_KEY is not set." };

  const today = indiaDate();

  const { data: created, error: createError } = await supabase
    .from(TABLE)
    .insert({ run_date: today, trigger: input.trigger, mode, created_by: input.userId ?? null })
    .select("id")
    .single();
  if (createError || !created) {
    if (createError?.code === "23505") return { ok: false, skipped: `Already ran today (${today}).` };
    return { ok: false, skipped: `Could not start a run: ${createError?.message ?? "unknown error"}` };
  }
  const runId = created.id as string;

  const update = async (fields: Record<string, unknown>) => {
    const { error } = await supabase.from(TABLE).update(fields).eq("id", runId);
    if (error) console.error("[marketing-agents] run update failed", error.message);
  };

  try {
    // ── Choose today's service ────────────────────────────────────────────
    const [services, featuredServices] = await Promise.all([getPublicServices(), getPublicFeaturedServices()]);
    const featured = new Set(featuredServices.map((item) => item.slug));
    const { data: history } = await supabase
      .from(TABLE)
      .select("service_slug, run_date, creative")
      .in("status", ["completed", "partial"])
      .order("created_at", { ascending: false })
      .limit(90);

    const lastPostedAt: Record<string, string> = {};
    for (const row of history ?? []) {
      if (row.service_slug && !lastPostedAt[row.service_slug]) lastPostedAt[row.service_slug] = row.run_date;
    }

    const service = input.serviceSlug
      ? services.find((item) => item.slug === input.serviceSlug)
      : (() => {
          const picked = pickServiceForToday(
            services.map((item) => ({ slug: item.slug, featured: featured.has(item.slug) })),
            lastPostedAt,
            today,
          );
          return services.find((item) => item.slug === picked?.slug);
        })();
    if (!service) throw new Error("No service found to post about.");

    const recentAngles = (history ?? [])
      .filter((row) => row.service_slug === service.slug)
      .map((row) => (row.creative as { angle?: string } | null)?.angle)
      .filter((angle): angle is string => Boolean(angle))
      .slice(0, 5);

    await update({ service_slug: service.slug, service_title: service.title, stage: "research" });

    // ── Agent 1: research ─────────────────────────────────────────────────
    const research = await runResearchAgent({ service, today });
    await update({ research, stage: "prompt" });

    // ── Agent 2: prompts ──────────────────────────────────────────────────
    const creative = await runPromptAgent({ service, research, recentAngles });
    await update({ creative, stage: "post" });

    // ── Agent 3: posts, poster and article ────────────────────────────────
    const posts = await runPostAgent({ service, research, creative });
    await update({ posts, stage: "poster" });

    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    let posterError: string | null = null;
    try {
      const poster = await runPosterAgent(creative);
      const extension = poster.mimeType.includes("jpeg") ? "jpg" : poster.mimeType.includes("webp") ? "webp" : "png";
      imagePath = `${today}/${service.slug}-${runId.slice(0, 8)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(imagePath, poster.bytes, { contentType: poster.mimeType, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl;
    } catch (caught) {
      // A post without a picture is still a post; carry on and say why.
      posterError = redact(caught instanceof Error ? caught.message : String(caught));
      imagePath = null;
    }
    await update({ image_url: imageUrl, image_path: imagePath, stage: "article" });

    const siteUrl = getSiteUrl();
    const servicePath = `/services/${service.slug}`;
    const campaign = campaignName(today, service.slug);

    // The article on our own site: the part of each day's work that Google keeps finding.
    const articleSlug = `${slugify(posts.article.title) || service.slug}-${today}`;
    const applyLink = trackedUrl({ siteUrl, path: servicePath, platform: "blog", campaign });
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        title: posts.article.title,
        slug: articleSlug,
        excerpt: posts.article.excerpt,
        content: `${posts.article.content.trim()}\n\nAbhi apply karein: ${applyLink}`,
        featured_image_url: imageUrl,
        featured_image_path: imagePath ? `${BUCKET}/${imagePath}` : null,
        category: service.category,
        seo_title: posts.article.seoTitle,
        seo_description: posts.article.seoDescription,
        keywords: posts.article.keywords,
        status: mode === "live" ? "published" : "draft",
        created_by: input.userId ?? null,
      })
      .select("id, slug")
      .single();
    if (articleError) console.error("[marketing-agents] article insert failed", articleError.message);
    await update({ article_id: article?.id ?? null, article_slug: article?.slug ?? null, stage: "publish" });
    if (mode === "live" && article) {
      try {
        revalidatePath("/blog");
      } catch {
        /* outside a request scope in tests */
      }
    }

    // ── Agent 4: publish ──────────────────────────────────────────────────
    const prepared = preparePosts({ posts, siteUrl, servicePath, campaign, platforms: configuredPlatforms() });
    await update({ prepared });

    const results: PublishResult[] =
      mode === "live"
        ? await runPublishAgent({ prepared, posts, imageUrl })
        : prepared.map((post) => ({ platform: post.platform, status: "skipped", error: "Draft mode — not posted." }));

    const attempted = results.filter((r) => r.status !== "skipped");
    const failed = attempted.filter((r) => r.status === "failed");
    const status: "completed" | "partial" | "failed" =
      attempted.length > 0 && failed.length === attempted.length ? "failed" : failed.length > 0 || posterError ? "partial" : "completed";

    const notes = [posterError ? `Poster: ${posterError}` : "", articleError ? `Article: ${articleError.message}` : ""]
      .filter(Boolean)
      .join(" | ");

    await update({ results, status, stage: "done", error: notes || null, finished_at: new Date().toISOString() });
    return { ok: true, runId, status, service: service.slug, results };
  } catch (caught) {
    const message = redact(caught instanceof Error ? caught.message : String(caught)).slice(0, 1000);
    await update({ status: "failed", error: message, finished_at: new Date().toISOString() });
    return { ok: true, runId, status: "failed", service: "", results: [] };
  }
}

export async function listMarketingRuns(limit = 20) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], tableMissing: false };
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, run_date, trigger, mode, status, stage, service_slug, service_title, creative, prepared, results, image_url, article_slug, error, created_at, finished_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { rows: [], tableMissing: error.code === "42P01" || /does not exist/i.test(error.message) };
  return { rows: data ?? [], tableMissing: false };
}
