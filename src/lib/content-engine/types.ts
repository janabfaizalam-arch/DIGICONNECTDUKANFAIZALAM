/**
 * The vocabulary of the AI Content Engine.
 *
 * One idea becomes one master post, which becomes one version per platform,
 * one design specification per version, one schedule row per platform, and
 * one analytics row per platform per collection. Everything below names a
 * piece of that chain.
 *
 * This module is deliberately free of `server-only`: the admin screens are
 * client components and need the same status names and platform labels the
 * server writes to the database. It therefore holds no secrets, no prompts
 * and no database access — only names and the shapes they travel in.
 */

/* ─────────────────────────────────────────────────────────────────────────
   The pipeline
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Where a piece of content has reached.
 *
 * The order here is the order of work, and `pipeline.ts` enforces that a row
 * only ever moves forward along it (or sideways into FAILED). A status is
 * never inferred from which columns happen to be filled: a post that has a
 * design row but has not been approved is APPROVAL_PENDING, and the
 * publishing gate reads the status rather than guessing.
 */
export const CONTENT_STAGES = [
  "IDEA",
  "RESEARCHING",
  "ANGLE_READY",
  "DRAFT_READY",
  "FACT_CHECK_PENDING",
  "FACT_CHECKED",
  "DESIGN_READY",
  "APPROVAL_PENDING",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ANALYZED",
] as const;

export type ContentStage = (typeof CONTENT_STAGES)[number];

/** A stage that went wrong. Reachable from anywhere, and recoverable. */
export const FAILED_STAGE = "FAILED" as const;

export type ContentStatus = ContentStage | typeof FAILED_STAGE;

export const CONTENT_STATUSES: ContentStatus[] = [...CONTENT_STAGES, FAILED_STAGE];

/* ─────────────────────────────────────────────────────────────────────────
   Ideas
   ───────────────────────────────────────────────────────────────────────── */

export const IDEA_STATUSES = ["NEW", "RANKED", "IN_PROGRESS", "USED", "REJECTED"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

/** Where an idea came from. Kept because it decides how much to trust it. */
export const IDEA_SOURCES = [
  "customer_question",
  "government_update",
  "service_catalogue",
  "past_performance",
  "faq",
  "comment",
  "document",
  "manual",
  "ai",
] as const;
export type IdeaSource = (typeof IDEA_SOURCES)[number];

/**
 * The five axes an idea is scored on, each out of ten.
 *
 * Five separate numbers rather than one because they disagree usefully: a
 * Labour Card deadline scores high on freshness and demand and low on
 * shareability, and that combination is what tells you to post it as a story
 * today rather than as a carousel next week.
 */
export const SCORE_AXES = [
  "hook_score",
  "demand_score",
  "freshness_score",
  "business_value_score",
  "shareability_score",
] as const;
export type ScoreAxis = (typeof SCORE_AXES)[number];

export const MAX_AXIS_SCORE = 10;
export const MAX_TOTAL_SCORE = SCORE_AXES.length * MAX_AXIS_SCORE;

export type IdeaScores = Record<ScoreAxis, number>;

export type ContentIdea = {
  id: string;
  title: string;
  description: string;
  source: IdeaSource;
  sourceUrl: string | null;
  category: string;
  targetAudience: string;
  scores: IdeaScores;
  totalScore: number;
  /** One or two lines, in plain words, saying why it scored what it scored. */
  scoreReason: string;
  suggestedFormat: ContentFormat;
  status: IdeaStatus;
  /** True when the topic touches a government scheme, rule, fee or deadline. */
  government: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   Formats and platforms
   ───────────────────────────────────────────────────────────────────────── */

export const CONTENT_FORMATS = [
  "REEL",
  "CAROUSEL",
  "STATIC_POSTER",
  "STORY",
  "THREAD",
  "FACEBOOK_POST",
  "YOUTUBE_SHORT",
  "WHATSAPP",
  "ARTICLE",
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_PLATFORMS = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "WHATSAPP",
  "LINKEDIN",
  "WEBSITE",
  "GOOGLE_BUSINESS",
] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

export const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  WHATSAPP: "WhatsApp",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
  GOOGLE_BUSINESS: "Google Business",
};

export const FORMAT_LABEL: Record<ContentFormat, string> = {
  REEL: "Reel",
  CAROUSEL: "Carousel",
  STATIC_POSTER: "Static poster",
  STORY: "Story",
  THREAD: "Thread",
  FACEBOOK_POST: "Facebook post",
  YOUTUBE_SHORT: "YouTube Short",
  WHATSAPP: "WhatsApp message",
  ARTICLE: "Website article",
};

export const MEDIA_TYPES = ["IMAGE", "VIDEO", "CAROUSEL", "TEXT", "DOCUMENT"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/* ─────────────────────────────────────────────────────────────────────────
   Angles
   ───────────────────────────────────────────────────────────────────────── */

export type ContentAngle = {
  hook: string;
  /** Why this hook works, so the admin can choose rather than guess. */
  reason: string;
  format: ContentFormat;
  /** 0–10. How different this is from hooks already used. */
  freshness: number;
  /** 0–10. Estimated appeal to the audience named on the idea. */
  appeal: number;
  recommended: boolean;
};

/* ─────────────────────────────────────────────────────────────────────────
   Posts and versions
   ───────────────────────────────────────────────────────────────────────── */

export const APPROVAL_STATUSES = ["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const FACT_CHECK_STATUSES = ["NOT_REQUIRED", "PENDING", "VERIFIED", "NEEDS_REVIEW", "REJECTED"] as const;
export type FactCheckStatus = (typeof FACT_CHECK_STATUSES)[number];

export type ContentPost = {
  id: string;
  ideaId: string | null;
  masterTopic: string;
  selectedAngle: string;
  hook: string;
  body: string;
  cta: string;
  contentType: ContentFormat;
  status: ContentStatus;
  factCheckStatus: FactCheckStatus;
  approvalStatus: ApprovalStatus;
  /**
   * Whether this post makes claims about a government scheme, rule, fee,
   * eligibility or deadline. It is the single flag the publishing gate reads
   * to decide that a human must sign off, so it is stored on the row rather
   * than recomputed from the text at publish time.
   */
  government: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const VERSION_STATUSES = ["DRAFT", "READY", "APPROVED", "PUBLISHED", "FAILED"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export type ContentVersion = {
  id: string;
  contentPostId: string;
  platform: ContentPlatform;
  title: string;
  hook: string;
  body: string;
  caption: string;
  hashtags: string[];
  cta: string;
  mediaType: MediaType;
  status: VersionStatus;
  createdAt: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   Research and fact checking
   ───────────────────────────────────────────────────────────────────────── */

export const SOURCE_RELIABILITY = ["OFFICIAL", "NEWS", "SECONDARY", "UNKNOWN"] as const;
export type SourceReliability = (typeof SOURCE_RELIABILITY)[number];

export type ContentSource = {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  publisher: string;
  publishedDate: string | null;
  accessedAt: string;
  reliability: SourceReliability;
  contentReference: string;
  createdAt: string;
};

export const VERIFICATION_STATUSES = ["VERIFIED", "NEEDS_REVIEW", "UNVERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type FactCheck = {
  id: string;
  contentPostId: string;
  claim: string;
  source: string;
  sourceUrl: string | null;
  verificationStatus: VerificationStatus;
  /** 0–1. How sure the checker is, shown to the admin as a percentage. */
  confidence: number;
  notes: string;
  /** True when the claim is the kind that costs somebody money if wrong. */
  critical: boolean;
  checkedAt: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   Design
   ───────────────────────────────────────────────────────────────────────── */

export const DESIGN_STATUSES = ["SPEC_READY", "GENERATING", "READY", "FAILED", "CONFIGURATION_REQUIRED"] as const;
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

export type DesignSpec = {
  canvas: { width: number; height: number; label: string };
  headline: string;
  subheadline: string;
  body: string[];
  cta: string;
  visualSuggestion: string;
  logoPlacement: string;
  colors: { primary: string; secondary: string; background: string; text: string };
  font: { heading: string; body: string };
  safeMargins: { top: number; right: number; bottom: number; left: number };
  /** The filled template, ready for Canva autofill or a local renderer. */
  variables: Record<string, string>;
};

export type ContentDesign = {
  id: string;
  contentPostId: string;
  platform: ContentPlatform;
  templateId: string;
  designId: string | null;
  previewUrl: string | null;
  exportUrl: string | null;
  status: DesignStatus;
  spec: DesignSpec;
  createdAt: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   Scheduling and publishing
   ───────────────────────────────────────────────────────────────────────── */

export const PUBLISHING_STATUSES = [
  "PENDING",
  "QUEUED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "SKIPPED",
  "CONFIGURATION_REQUIRED",
] as const;
export type PublishingStatus = (typeof PUBLISHING_STATUSES)[number];

export type ContentScheduleRow = {
  id: string;
  contentPostId: string;
  platform: ContentPlatform;
  scheduledAt: string;
  publishingStatus: PublishingStatus;
  externalPostId: string | null;
  errorMessage: string | null;
  attempts: number;
};

/* ─────────────────────────────────────────────────────────────────────────
   Analytics
   ───────────────────────────────────────────────────────────────────────── */

export type ContentAnalyticsRow = {
  id: string;
  contentPostId: string;
  platform: ContentPlatform;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  watchTimeSeconds: number;
  enquiries: number;
  leads: number;
  customers: number;
  revenue: number | null;
  collectedAt: string;
};

/* ─────────────────────────────────────────────────────────────────────────
   Brand
   ───────────────────────────────────────────────────────────────────────── */

export type BrandVoiceGuide = {
  sentenceStyle: string;
  vocabulary: string;
  tone: string;
  hookStyle: string;
  ctaStyle: string;
  paragraphLength: string;
  punctuation: string;
  commonPhrases: string[];
  wordsToAvoid: string[];
  /** When the guide was last produced from real posts, not assumed. */
  analyzedAt: string | null;
  /** How many of the shop's own posts the guide was derived from. */
  sampleCount: number;
};

export type BrandSettings = {
  brandName: string;
  logoUrl: string | null;
  primaryColors: string[];
  secondaryColors: string[];
  fonts: { heading: string; body: string };
  tone: string;
  preferredLanguage: string;
  wordsToAvoid: string[];
  ctaRules: string[];
  audience: string;
  businessCategories: string[];
  visualRules: string[];
  voice: BrandVoiceGuide;
};

/* ─────────────────────────────────────────────────────────────────────────
   Automation switches
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What the engine is allowed to do without being asked.
 *
 * `autoPublish` is off, and government content has a second switch that is
 * off on top of that. Both are read by the publishing gate, which refuses
 * rather than asks: a scheme amount that reaches Instagram before a human
 * read it is not a bug you can apologise for afterwards.
 */
export type EngineSettings = {
  autoResearch: boolean;
  autoIdeaGeneration: boolean;
  autoWriting: boolean;
  autoDesign: boolean;
  autoRepurpose: boolean;
  autoPublish: boolean;
  /** Never true unless an administrator deliberately turns it on. */
  autoPublishGovernment: boolean;
  humanApprovalRequired: boolean;
  weeklyPlan: WeeklyPlan;
};

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** What kind of post each day of the week gets, and at what local time. */
export type WeeklyPlan = Record<Weekday, { theme: string; time: string; platforms: ContentPlatform[] }>;

/* ─────────────────────────────────────────────────────────────────────────
   Activity
   ───────────────────────────────────────────────────────────────────────── */

export type ActivityEntry = {
  id: string;
  entity: "idea" | "post" | "version" | "design" | "schedule" | "analytics" | "settings";
  entityId: string;
  fromStatus: string | null;
  toStatus: string | null;
  action: string;
  actor: string;
  detail: string;
  createdAt: string;
};
