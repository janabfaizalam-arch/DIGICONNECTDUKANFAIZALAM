import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_BRAND, DEFAULT_VOICE, mergeVoice } from "@/lib/content-engine/brand-voice";
import { DEFAULT_WEEKLY_PLAN, normalizePlan } from "@/lib/content-engine/scheduler";
import { normalizeScores, totalScore } from "@/lib/content-engine/scoring";
import type {
  ActivityEntry,
  BrandSettings,
  ContentAnalyticsRow,
  ContentDesign,
  ContentIdea,
  ContentPlatform,
  ContentPost,
  ContentScheduleRow,
  ContentStatus,
  ContentVersion,
  EngineSettings,
  FactCheck,
  IdeaSource,
  IdeaStatus,
} from "@/lib/content-engine/types";

/**
 * The only place this engine reads or writes its tables.
 *
 * Every route, engine and cron job goes through here, which buys three
 * things: the snake_case-to-camelCase translation happens once, a missing
 * migration produces one recognisable answer instead of fourteen different
 * PostgREST errors, and there is a single list of the columns each table
 * actually has — the thing that rots first when a schema changes.
 */

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST202"]);

/**
 * The tables are not there yet.
 *
 * The migration is applied by hand in the Supabase SQL editor in this project
 * — that is how every other table here arrived — so "not migrated yet" is a
 * real state the screens have to render, not a bug. It is told apart from a
 * genuine failure so the admin is shown "run the migration" rather than
 * "something went wrong".
 */
export class ContentEngineNotInstalledError extends Error {
  constructor() {
    super(
      "AI Content Engine ki tables abhi banayi nahi gayi hain. Supabase SQL editor mein migration " +
        "20260906120000_ai_content_engine.sql chalaiye, phir ye screen dobara kholiye.",
    );
    this.name = "ContentEngineNotInstalledError";
  }
}

export class ContentEngineUnavailableError extends Error {
  constructor(message = "Database is not configured on this deployment.") {
    super(message);
    this.name = "ContentEngineUnavailableError";
  }
}

function isMissingTable(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) return true;
  return /does not exist|could not find the table|schema cache/i.test(error.message ?? "");
}

function client() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ContentEngineUnavailableError();
  return supabase;
}

/** Every read and write funnels through this, so one error shape reaches callers. */
function unwrap<T>(result: { data: T | null; error: { code?: string | null; message?: string | null } | null }): T {
  if (result.error) {
    if (isMissingTable(result.error)) throw new ContentEngineNotInstalledError();
    throw new Error(result.error.message ?? "The content engine database call failed.");
  }
  return result.data as T;
}

/** True when the migration has been applied. Used by screens to show a setup card. */
export async function isInstalled(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase.from("content_engine_settings").select("id").limit(1);
  return !error;
}

/* ─────────────────────────────────────────────────────────────────────────
   Row shapes
   ───────────────────────────────────────────────────────────────────────── */

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

type IdeaRow = Record<string, unknown>;

function toIdea(row: IdeaRow): ContentIdea {
  const scores = normalizeScores({
    hook_score: row.hook_score,
    demand_score: row.demand_score,
    freshness_score: row.freshness_score,
    business_value_score: row.business_value_score,
    shareability_score: row.shareability_score,
  });

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    source: String(row.source ?? "manual") as IdeaSource,
    sourceUrl: (row.source_url as string | null) ?? null,
    category: String(row.category ?? "General"),
    targetAudience: String(row.target_audience ?? ""),
    scores,
    totalScore: Number(row.total_score ?? totalScore(scores)),
    scoreReason: String(row.score_reason ?? ""),
    suggestedFormat: String(row.suggested_format ?? "STATIC_POSTER") as ContentIdea["suggestedFormat"],
    status: String(row.status ?? "NEW") as IdeaStatus,
    government: Boolean(row.is_government),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function toPost(row: Record<string, unknown>): ContentPost {
  return {
    id: String(row.id),
    ideaId: (row.idea_id as string | null) ?? null,
    masterTopic: String(row.master_topic ?? ""),
    selectedAngle: String(row.selected_angle ?? ""),
    hook: String(row.hook ?? ""),
    body: String(row.body ?? ""),
    cta: String(row.cta ?? ""),
    contentType: String(row.content_type ?? "STATIC_POSTER") as ContentPost["contentType"],
    status: String(row.status ?? "IDEA") as ContentStatus,
    factCheckStatus: String(row.fact_check_status ?? "NOT_REQUIRED") as ContentPost["factCheckStatus"],
    approvalStatus: String(row.approval_status ?? "PENDING") as ContentPost["approvalStatus"],
    government: Boolean(row.is_government),
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function toVersion(row: Record<string, unknown>): ContentVersion {
  return {
    id: String(row.id),
    contentPostId: String(row.content_post_id),
    platform: String(row.platform) as ContentPlatform,
    title: String(row.title ?? ""),
    hook: String(row.hook ?? ""),
    body: String(row.body ?? ""),
    caption: String(row.caption ?? ""),
    hashtags: stringList(row.hashtags),
    cta: String(row.cta ?? ""),
    mediaType: String(row.media_type ?? "IMAGE") as ContentVersion["mediaType"],
    status: String(row.status ?? "DRAFT") as ContentVersion["status"],
    createdAt: String(row.created_at ?? ""),
  };
}

function toFactCheck(row: Record<string, unknown>): FactCheck {
  return {
    id: String(row.id),
    contentPostId: String(row.content_post_id),
    claim: String(row.claim ?? ""),
    source: String(row.source ?? ""),
    sourceUrl: (row.source_url as string | null) ?? null,
    verificationStatus: String(row.verification_status ?? "UNVERIFIED") as FactCheck["verificationStatus"],
    confidence: Number(row.confidence ?? 0),
    notes: String(row.notes ?? ""),
    critical: Boolean(row.is_critical),
    checkedAt: String(row.checked_at ?? ""),
  };
}

function toDesign(row: Record<string, unknown>): ContentDesign {
  return {
    id: String(row.id),
    contentPostId: String(row.content_post_id),
    platform: String(row.platform) as ContentPlatform,
    templateId: String(row.template_id ?? ""),
    designId: (row.design_id as string | null) ?? null,
    previewUrl: (row.preview_url as string | null) ?? null,
    exportUrl: (row.export_url as string | null) ?? null,
    status: String(row.status ?? "SPEC_READY") as ContentDesign["status"],
    spec: (row.spec ?? {}) as ContentDesign["spec"],
    createdAt: String(row.created_at ?? ""),
  };
}

function toSchedule(row: Record<string, unknown>): ContentScheduleRow {
  return {
    id: String(row.id),
    contentPostId: String(row.content_post_id),
    platform: String(row.platform) as ContentPlatform,
    scheduledAt: String(row.scheduled_at ?? ""),
    publishingStatus: String(row.publishing_status ?? "PENDING") as ContentScheduleRow["publishingStatus"],
    externalPostId: (row.external_post_id as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    attempts: Number(row.attempts ?? 0),
  };
}

function toAnalytics(row: Record<string, unknown>): ContentAnalyticsRow {
  const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  return {
    id: String(row.id),
    contentPostId: String(row.content_post_id),
    platform: String(row.platform) as ContentPlatform,
    impressions: number(row.impressions),
    reach: number(row.reach),
    views: number(row.views),
    likes: number(row.likes),
    comments: number(row.comments),
    shares: number(row.shares),
    saves: number(row.saves),
    clicks: number(row.clicks),
    watchTimeSeconds: number(row.watch_time_seconds),
    enquiries: number(row.enquiries),
    leads: number(row.leads),
    customers: number(row.customers),
    revenue: row.revenue === null || row.revenue === undefined ? null : number(row.revenue),
    collectedAt: String(row.collected_at ?? ""),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Ideas
   ───────────────────────────────────────────────────────────────────────── */

export async function listIdeas(options?: { status?: IdeaStatus[]; limit?: number }): Promise<ContentIdea[]> {
  let query = client()
    .from("content_ideas")
    .select("*")
    .order("total_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.status?.length) query = query.in("status", options.status);
  return (unwrap(await query) ?? []).map(toIdea);
}

export async function getIdea(id: string): Promise<ContentIdea | null> {
  const row = unwrap(await client().from("content_ideas").select("*").eq("id", id).maybeSingle());
  return row ? toIdea(row) : null;
}

export type NewIdea = Omit<ContentIdea, "id" | "createdAt" | "updatedAt" | "totalScore"> & {
  totalScore?: number;
};

export async function insertIdeas(ideas: NewIdea[]): Promise<ContentIdea[]> {
  if (!ideas.length) return [];
  const rows = ideas.map((idea) => ({
    title: idea.title,
    description: idea.description,
    source: idea.source,
    source_url: idea.sourceUrl,
    category: idea.category,
    target_audience: idea.targetAudience,
    hook_score: idea.scores.hook_score,
    demand_score: idea.scores.demand_score,
    freshness_score: idea.scores.freshness_score,
    business_value_score: idea.scores.business_value_score,
    shareability_score: idea.scores.shareability_score,
    total_score: idea.totalScore ?? totalScore(idea.scores),
    score_reason: idea.scoreReason,
    suggested_format: idea.suggestedFormat,
    status: idea.status,
    is_government: idea.government,
  }));

  return (unwrap(await client().from("content_ideas").insert(rows).select("*")) ?? []).map(toIdea);
}

export async function updateIdea(id: string, patch: Partial<ContentIdea>): Promise<ContentIdea | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.targetAudience !== undefined) update.target_audience = patch.targetAudience;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.suggestedFormat !== undefined) update.suggested_format = patch.suggestedFormat;
  if (patch.scoreReason !== undefined) update.score_reason = patch.scoreReason;
  if (patch.government !== undefined) update.is_government = patch.government;
  if (patch.scores) {
    Object.assign(update, patch.scores, { total_score: totalScore(patch.scores) });
  }

  const rows = unwrap(await client().from("content_ideas").update(update).eq("id", id).select("*"));
  return rows?.length ? toIdea(rows[0]) : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Posts
   ───────────────────────────────────────────────────────────────────────── */

export async function listPosts(options?: {
  status?: ContentStatus[];
  limit?: number;
}): Promise<ContentPost[]> {
  let query = client()
    .from("content_posts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 100);
  if (options?.status?.length) query = query.in("status", options.status);
  return (unwrap(await query) ?? []).map(toPost);
}

export async function getPost(id: string): Promise<ContentPost | null> {
  const row = unwrap(await client().from("content_posts").select("*").eq("id", id).maybeSingle());
  return row ? toPost(row) : null;
}

export async function insertPost(post: {
  ideaId: string | null;
  masterTopic: string;
  selectedAngle: string;
  hook: string;
  body: string;
  cta: string;
  contentType: ContentPost["contentType"];
  status: ContentStatus;
  government: boolean;
  factCheckStatus: ContentPost["factCheckStatus"];
  approvalStatus: ContentPost["approvalStatus"];
}): Promise<ContentPost> {
  const rows = unwrap(
    await client()
      .from("content_posts")
      .insert({
        idea_id: post.ideaId,
        master_topic: post.masterTopic,
        selected_angle: post.selectedAngle,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
        content_type: post.contentType,
        status: post.status,
        is_government: post.government,
        fact_check_status: post.factCheckStatus,
        approval_status: post.approvalStatus,
      })
      .select("*"),
  );
  if (!rows?.length) throw new Error("The post could not be created.");
  return toPost(rows[0]);
}

export type PostPatch = Partial<
  Pick<
    ContentPost,
    | "masterTopic"
    | "selectedAngle"
    | "hook"
    | "body"
    | "cta"
    | "contentType"
    | "status"
    | "factCheckStatus"
    | "approvalStatus"
    | "government"
    | "scheduledAt"
    | "publishedAt"
  >
> & {
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  failureReason?: string | null;
};

export async function updatePost(id: string, patch: PostPatch): Promise<ContentPost | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    masterTopic: "master_topic",
    selectedAngle: "selected_angle",
    hook: "hook",
    body: "body",
    cta: "cta",
    contentType: "content_type",
    status: "status",
    factCheckStatus: "fact_check_status",
    approvalStatus: "approval_status",
    government: "is_government",
    scheduledAt: "scheduled_at",
    publishedAt: "published_at",
    approvedBy: "approved_by",
    approvedAt: "approved_at",
    rejectionReason: "rejection_reason",
    failureReason: "failure_reason",
  };

  for (const [key, column] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) update[column] = value;
  }

  const rows = unwrap(await client().from("content_posts").update(update).eq("id", id).select("*"));
  /*
    PostgREST reports an update that matched nothing as a success. Returning
    null here rather than a fabricated row is what lets a caller tell "saved"
    from "that post is gone", instead of telling an administrator their
    approval was recorded when it was not.
  */
  return rows?.length ? toPost(rows[0]) : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Versions, fact checks, designs
   ───────────────────────────────────────────────────────────────────────── */

export async function listVersions(postId: string): Promise<ContentVersion[]> {
  return (
    unwrap(await client().from("content_versions").select("*").eq("content_post_id", postId)) ?? []
  ).map(toVersion);
}

export async function upsertVersion(version: Omit<ContentVersion, "id" | "createdAt">): Promise<ContentVersion> {
  const rows = unwrap(
    await client()
      .from("content_versions")
      .upsert(
        {
          content_post_id: version.contentPostId,
          platform: version.platform,
          title: version.title,
          hook: version.hook,
          body: version.body,
          caption: version.caption,
          hashtags: version.hashtags,
          cta: version.cta,
          media_type: version.mediaType,
          status: version.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_post_id,platform" },
      )
      .select("*"),
  );
  if (!rows?.length) throw new Error("The platform version could not be saved.");
  return toVersion(rows[0]);
}

export async function listFactChecks(postId: string): Promise<FactCheck[]> {
  return (
    unwrap(
      await client()
        .from("content_fact_checks")
        .select("*")
        .eq("content_post_id", postId)
        .order("is_critical", { ascending: false }),
    ) ?? []
  ).map(toFactCheck);
}

export async function replaceFactChecks(
  postId: string,
  checks: Omit<FactCheck, "id" | "contentPostId" | "checkedAt">[],
): Promise<FactCheck[]> {
  const supabase = client();
  unwrap(await supabase.from("content_fact_checks").delete().eq("content_post_id", postId).select("id"));
  if (!checks.length) return [];

  return (
    unwrap(
      await supabase
        .from("content_fact_checks")
        .insert(
          checks.map((check) => ({
            content_post_id: postId,
            claim: check.claim,
            source: check.source,
            source_url: check.sourceUrl,
            verification_status: check.verificationStatus,
            confidence: check.confidence,
            notes: check.notes,
            is_critical: check.critical,
          })),
        )
        .select("*"),
    ) ?? []
  ).map(toFactCheck);
}

export async function reviewFactCheck(
  id: string,
  patch: { verificationStatus: FactCheck["verificationStatus"]; notes?: string; reviewedBy: string },
): Promise<FactCheck | null> {
  const rows = unwrap(
    await client()
      .from("content_fact_checks")
      .update({
        verification_status: patch.verificationStatus,
        notes: patch.notes,
        reviewed_by: patch.reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*"),
  );
  return rows?.length ? toFactCheck(rows[0]) : null;
}

export async function listDesigns(postId: string): Promise<ContentDesign[]> {
  return (
    unwrap(await client().from("content_designs").select("*").eq("content_post_id", postId)) ?? []
  ).map(toDesign);
}

export async function upsertDesign(
  design: Omit<ContentDesign, "id" | "createdAt"> & { errorMessage?: string | null },
): Promise<ContentDesign> {
  const rows = unwrap(
    await client()
      .from("content_designs")
      .upsert(
        {
          content_post_id: design.contentPostId,
          platform: design.platform,
          template_id: design.templateId,
          design_id: design.designId,
          preview_url: design.previewUrl,
          export_url: design.exportUrl,
          status: design.status,
          spec: design.spec,
          error_message: design.errorMessage ?? null,
        },
        { onConflict: "content_post_id,platform" },
      )
      .select("*"),
  );
  if (!rows?.length) throw new Error("The design could not be saved.");
  return toDesign(rows[0]);
}

/* ─────────────────────────────────────────────────────────────────────────
   Schedule
   ───────────────────────────────────────────────────────────────────────── */

export async function listSchedule(options?: {
  from?: string;
  to?: string;
  status?: ContentScheduleRow["publishingStatus"][];
}): Promise<ContentScheduleRow[]> {
  let query = client().from("content_schedule").select("*").order("scheduled_at", { ascending: true });
  if (options?.from) query = query.gte("scheduled_at", options.from);
  if (options?.to) query = query.lte("scheduled_at", options.to);
  if (options?.status?.length) query = query.in("publishing_status", options.status);
  return (unwrap(await query) ?? []).map(toSchedule);
}

export async function upsertScheduleRows(
  rows: { contentPostId: string; platform: ContentPlatform; scheduledAt: string }[],
): Promise<ContentScheduleRow[]> {
  if (!rows.length) return [];
  return (
    unwrap(
      await client()
        .from("content_schedule")
        .upsert(
          rows.map((row) => ({
            content_post_id: row.contentPostId,
            platform: row.platform,
            scheduled_at: row.scheduledAt,
            publishing_status: "PENDING",
            error_message: null,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "content_post_id,platform" },
        )
        .select("*"),
    ) ?? []
  ).map(toSchedule);
}

/**
 * Take a due row so that a second worker cannot take it.
 *
 * The update is conditional on the row still being PENDING or QUEUED, and
 * PostgREST returns the rows it actually changed — so the loser of a race
 * gets an empty array and skips, rather than both workers publishing the same
 * post to the same account.
 */
export async function claimScheduleRow(id: string): Promise<ContentScheduleRow | null> {
  const rows = unwrap(
    await client()
      .from("content_schedule")
      .update({ publishing_status: "PUBLISHING", claimed_at: new Date().toISOString() })
      .eq("id", id)
      .in("publishing_status", ["PENDING", "QUEUED"])
      .select("*"),
  );
  return rows?.length ? toSchedule(rows[0]) : null;
}

export async function finishScheduleRow(
  id: string,
  outcome: {
    publishingStatus: ContentScheduleRow["publishingStatus"];
    externalPostId?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  const current = unwrap(
    await client().from("content_schedule").select("attempts").eq("id", id).maybeSingle(),
  );

  unwrap(
    await client()
      .from("content_schedule")
      .update({
        publishing_status: outcome.publishingStatus,
        external_post_id: outcome.externalPostId ?? null,
        error_message: outcome.errorMessage ?? null,
        attempts: Number((current as { attempts?: number } | null)?.attempts ?? 0) + 1,
        published_at: outcome.publishingStatus === "PUBLISHED" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id"),
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Analytics
   ───────────────────────────────────────────────────────────────────────── */

export async function listAnalytics(since?: string): Promise<ContentAnalyticsRow[]> {
  let query = client().from("content_analytics").select("*");
  if (since) query = query.gte("collected_at", since);
  return (unwrap(await query) ?? []).map(toAnalytics);
}

export async function upsertAnalytics(
  rows: (Omit<ContentAnalyticsRow, "id" | "collectedAt"> & { collectedAt?: string })[],
): Promise<number> {
  if (!rows.length) return 0;
  const saved = unwrap(
    await client()
      .from("content_analytics")
      .upsert(
        rows.map((row) => ({
          content_post_id: row.contentPostId,
          platform: row.platform,
          impressions: row.impressions,
          reach: row.reach,
          views: row.views,
          likes: row.likes,
          comments: row.comments,
          shares: row.shares,
          saves: row.saves,
          clicks: row.clicks,
          watch_time_seconds: row.watchTimeSeconds,
          enquiries: row.enquiries,
          leads: row.leads,
          customers: row.customers,
          revenue: row.revenue,
          collected_at: row.collectedAt ?? new Date().toISOString(),
        })),
        { onConflict: "content_post_id,platform" },
      )
      .select("id"),
  );
  return saved?.length ?? 0;
}

export async function saveLearning(input: {
  periodStart: string;
  periodEnd: string;
  postsAnalyzed: number;
  comparison: unknown;
  summary: string;
  winningTopics: string[];
  winningHooks: string[];
  winningFormats: string[];
  winningCtas: string[];
  winningTimes: string[];
  weakTopics: string[];
  weakHooks: string[];
  weakFormats: string[];
}): Promise<void> {
  unwrap(
    await client()
      .from("content_learnings")
      .insert({
        period_start: input.periodStart,
        period_end: input.periodEnd,
        posts_analyzed: input.postsAnalyzed,
        comparison: input.comparison,
        summary: input.summary,
        winning_topics: input.winningTopics,
        winning_hooks: input.winningHooks,
        winning_formats: input.winningFormats,
        winning_ctas: input.winningCtas,
        winning_times: input.winningTimes,
        weak_topics: input.weakTopics,
        weak_hooks: input.weakHooks,
        weak_formats: input.weakFormats,
      })
      .select("id"),
  );
}

export async function latestLearning(): Promise<{ summary: string; createdAt: string } | null> {
  const rows = unwrap(
    await client()
      .from("content_learnings")
      .select("summary, created_at")
      .order("created_at", { ascending: false })
      .limit(1),
  );
  if (!rows?.length) return null;
  const row = rows[0] as { summary: string; created_at: string };
  return { summary: row.summary, createdAt: row.created_at };
}

/* ─────────────────────────────────────────────────────────────────────────
   Brand and settings
   ───────────────────────────────────────────────────────────────────────── */

export async function getBrand(): Promise<BrandSettings> {
  const row = unwrap(
    await client().from("content_brand_settings").select("*").eq("id", "default").maybeSingle(),
  ) as Record<string, unknown> | null;

  if (!row) return DEFAULT_BRAND;

  const voice = mergeVoice(DEFAULT_VOICE, (row.voice ?? {}) as Record<string, never>);
  const stored = (row.voice ?? {}) as Record<string, unknown>;

  return {
    brandName: String(row.brand_name || DEFAULT_BRAND.brandName),
    logoUrl: (row.logo_url as string | null) ?? null,
    primaryColors: stringList(row.primary_colors).length
      ? stringList(row.primary_colors)
      : DEFAULT_BRAND.primaryColors,
    secondaryColors: stringList(row.secondary_colors).length
      ? stringList(row.secondary_colors)
      : DEFAULT_BRAND.secondaryColors,
    fonts: (row.fonts && Object.keys(row.fonts).length
      ? row.fonts
      : DEFAULT_BRAND.fonts) as BrandSettings["fonts"],
    tone: String(row.tone || DEFAULT_BRAND.tone),
    preferredLanguage: String(row.preferred_language || DEFAULT_BRAND.preferredLanguage),
    wordsToAvoid: stringList(row.words_to_avoid).length
      ? stringList(row.words_to_avoid)
      : DEFAULT_BRAND.wordsToAvoid,
    ctaRules: stringList(row.cta_rules).length ? stringList(row.cta_rules) : DEFAULT_BRAND.ctaRules,
    audience: String(row.audience || DEFAULT_BRAND.audience),
    businessCategories: stringList(row.business_categories).length
      ? stringList(row.business_categories)
      : DEFAULT_BRAND.businessCategories,
    visualRules: stringList(row.visual_rules).length ? stringList(row.visual_rules) : DEFAULT_BRAND.visualRules,
    voice: {
      ...voice,
      // Provenance is the server's to state, never the model's.
      analyzedAt: typeof stored.analyzedAt === "string" ? stored.analyzedAt : null,
      sampleCount: Number(stored.sampleCount ?? 0),
    },
  };
}

export async function saveBrand(patch: Partial<BrandSettings> & { samplePosts?: string[] }): Promise<BrandSettings> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.brandName !== undefined) update.brand_name = patch.brandName;
  if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl;
  if (patch.primaryColors) update.primary_colors = patch.primaryColors;
  if (patch.secondaryColors) update.secondary_colors = patch.secondaryColors;
  if (patch.fonts) update.fonts = patch.fonts;
  if (patch.tone !== undefined) update.tone = patch.tone;
  if (patch.preferredLanguage !== undefined) update.preferred_language = patch.preferredLanguage;
  if (patch.wordsToAvoid) update.words_to_avoid = patch.wordsToAvoid;
  if (patch.ctaRules) update.cta_rules = patch.ctaRules;
  if (patch.audience !== undefined) update.audience = patch.audience;
  if (patch.businessCategories) update.business_categories = patch.businessCategories;
  if (patch.visualRules) update.visual_rules = patch.visualRules;
  if (patch.voice) update.voice = patch.voice;
  if (patch.samplePosts) update.sample_posts = patch.samplePosts;

  unwrap(
    await client()
      .from("content_brand_settings")
      .upsert({ id: "default", ...update }, { onConflict: "id" })
      .select("id"),
  );
  return getBrand();
}

export async function getSamplePosts(): Promise<string[]> {
  const row = unwrap(
    await client().from("content_brand_settings").select("sample_posts").eq("id", "default").maybeSingle(),
  ) as { sample_posts?: unknown } | null;
  return stringList(row?.sample_posts);
}

export async function getSettings(): Promise<EngineSettings> {
  const row = unwrap(
    await client().from("content_engine_settings").select("*").eq("id", "default").maybeSingle(),
  ) as Record<string, unknown> | null;

  const plan = row?.weekly_plan && Object.keys(row.weekly_plan).length ? normalizePlan(row.weekly_plan) : DEFAULT_WEEKLY_PLAN;

  return {
    autoResearch: row ? Boolean(row.auto_research) : true,
    autoIdeaGeneration: row ? Boolean(row.auto_idea_generation) : true,
    autoWriting: row ? Boolean(row.auto_writing) : true,
    autoDesign: row ? Boolean(row.auto_design) : true,
    autoRepurpose: row ? Boolean(row.auto_repurpose) : true,
    // Defaulting these two to false when the row is missing is the whole
    // point: an unreadable settings row must never read as permission.
    autoPublish: row ? Boolean(row.auto_publish) : false,
    autoPublishGovernment: row ? Boolean(row.auto_publish_government) : false,
    humanApprovalRequired: row ? Boolean(row.human_approval_required) : true,
    weeklyPlan: plan,
  };
}

export async function saveSettings(patch: Partial<EngineSettings>): Promise<EngineSettings> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    autoResearch: "auto_research",
    autoIdeaGeneration: "auto_idea_generation",
    autoWriting: "auto_writing",
    autoDesign: "auto_design",
    autoRepurpose: "auto_repurpose",
    autoPublish: "auto_publish",
    autoPublishGovernment: "auto_publish_government",
    humanApprovalRequired: "human_approval_required",
  };
  for (const [key, column] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) update[column] = Boolean(value);
  }
  if (patch.weeklyPlan) update.weekly_plan = normalizePlan(patch.weeklyPlan);

  unwrap(
    await client()
      .from("content_engine_settings")
      .upsert({ id: "default", ...update }, { onConflict: "id" })
      .select("id"),
  );
  return getSettings();
}

/* ─────────────────────────────────────────────────────────────────────────
   Hooks and activity
   ───────────────────────────────────────────────────────────────────────── */

export async function listUsedHooks(limit = 200): Promise<string[]> {
  const rows = unwrap(
    await client().from("content_hooks_used").select("hook").order("used_at", { ascending: false }).limit(limit),
  );
  return (rows ?? []).map((row) => String((row as { hook: string }).hook));
}

export async function recordHook(hook: string, style: string, postId: string | null): Promise<void> {
  if (!hook.trim()) return;
  unwrap(
    await client()
      .from("content_hooks_used")
      .insert({ hook: hook.trim(), hook_style: style, content_post_id: postId })
      .select("id"),
  );
}

export async function listActivity(options?: {
  entityId?: string;
  limit?: number;
}): Promise<ActivityEntry[]> {
  let query = client()
    .from("content_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);
  if (options?.entityId) query = query.eq("entity_id", options.entityId);

  return (unwrap(await query) ?? []).map((row) => {
    const entry = row as Record<string, unknown>;
    return {
      id: String(entry.id),
      entity: String(entry.entity) as ActivityEntry["entity"],
      entityId: String(entry.entity_id ?? ""),
      fromStatus: (entry.from_status as string | null) ?? null,
      toStatus: (entry.to_status as string | null) ?? null,
      action: String(entry.action ?? ""),
      actor: String(entry.actor ?? "system"),
      detail: String(entry.detail ?? ""),
      createdAt: String(entry.created_at ?? ""),
    };
  });
}
