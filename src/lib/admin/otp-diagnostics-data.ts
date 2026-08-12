import {
  assessOtpHealth,
  classifyOtpAttempt,
  summariseOtpAttempts,
  type OtpAttemptClassification,
  type OtpAttemptSummary,
  type OtpHealthVerdict,
} from "@/lib/admin/otp-diagnostics-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  describeOtpPayloadContract,
  resolveOtpCampaign,
  type AisensyOtpPayloadContract,
} from "@/lib/whatsapp/aisensy";

const ATTEMPT_LIMIT = 25;

export type OtpAttemptRow = {
  id: string;
  purpose: string;
  phoneMasked: string;
  createdAt: string | null;
  campaign: string | null;
  submittedMessageId: string | null;
  classification: OtpAttemptClassification;
};

export type OtpDiagnostics = {
  config: {
    apiKeyConfigured: boolean;
    apiUrl: string;
    signupCampaign: string | null;
    signupCampaignSource: string | null;
    signupCampaignConfigured: boolean;
    loginCampaignConfigured: boolean;
    resetCampaignConfigured: boolean;
    webhookSecretConfigured: boolean;
    messageStatusUrlConfigured: boolean;
    environment: string;
    payloadContract: AisensyOtpPayloadContract;
  };
  attempts: OtpAttemptRow[];
  summary: OtpAttemptSummary;
  health: OtpHealthVerdict;
  /** Set when the OTP table could not be read at all. */
  loadError: string | null;
};

function maskLocal(phone: unknown): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(-10);
  if (local.length !== 10) return "••••••••••";
  return `${local.slice(0, 2)}••••••${local.slice(-2)}`;
}

function metaString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Read recent OTP attempts and turn them into an operator-readable verdict.
 *
 * Never returns OTP codes or hashes — only delivery bookkeeping.
 */
export async function loadOtpDiagnostics(): Promise<OtpDiagnostics> {
  const signup = resolveOtpCampaign("customer_signup");
  const login = resolveOtpCampaign("login");
  const reset = resolveOtpCampaign("forgot_pin");

  const apiKeyConfigured = Boolean(
    process.env.AISENSY_API_KEY?.trim() || process.env.AISENSY_PROJECT_API_KEY?.trim(),
  );
  const webhookSecretConfigured = Boolean(process.env.AISENSY_WEBHOOK_SECRET?.trim());

  const config: OtpDiagnostics["config"] = {
    apiKeyConfigured,
    apiUrl: (
      process.env.AISENSY_API_URL?.trim() ||
      process.env.AISENSY_API_BASE_URL?.trim() ||
      process.env.AISENSY_BASE_URL?.trim() ||
      "https://backend.aisensy.com/campaign/t1/api/v2"
    ).replace(/\/$/, ""),
    signupCampaign: signup.ok ? signup.campaignName : null,
    signupCampaignSource: signup.ok ? signup.source : null,
    signupCampaignConfigured: signup.ok,
    loginCampaignConfigured: login.ok,
    resetCampaignConfigured: reset.ok,
    webhookSecretConfigured,
    messageStatusUrlConfigured: Boolean(process.env.AISENSY_MESSAGE_STATUS_URL?.trim()),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    payloadContract: describeOtpPayloadContract(),
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const summary = summariseOtpAttempts([]);
    return {
      config,
      attempts: [],
      summary,
      health: assessOtpHealth({
        apiKeyConfigured,
        signupCampaignConfigured: signup.ok,
        webhookSecretConfigured,
        summary,
      }),
      loadError: "Supabase service role is not configured, so OTP history cannot be read.",
    };
  }

  const { data, error } = await supabase
    .from("auth_otp_requests")
    .select("id, purpose, phone, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(ATTEMPT_LIMIT);

  if (error) {
    const summary = summariseOtpAttempts([]);
    return {
      config,
      attempts: [],
      summary,
      health: assessOtpHealth({
        apiKeyConfigured,
        signupCampaignConfigured: signup.ok,
        webhookSecretConfigured,
        summary,
      }),
      loadError: `OTP history could not be read: ${error.message}`,
    };
  }

  const attempts: OtpAttemptRow[] = (data ?? []).map((row) => ({
    id: String(row.id),
    purpose: String(row.purpose ?? "unknown"),
    phoneMasked: maskLocal(row.phone),
    createdAt: (row.created_at as string | null) ?? null,
    campaign: metaString(row.metadata, "campaign"),
    submittedMessageId: metaString(row.metadata, "submitted_message_id"),
    classification: classifyOtpAttempt(row.metadata),
  }));

  // Health is judged on signup only — a healthy reset flow must not mask a
  // broken signup campaign, since they can be different AiSensy campaigns.
  const signupAttempts = attempts.filter((attempt) => attempt.purpose === "customer_signup");
  const summary = summariseOtpAttempts(signupAttempts);

  return {
    config,
    attempts,
    summary,
    health: assessOtpHealth({
      apiKeyConfigured,
      signupCampaignConfigured: signup.ok,
      webhookSecretConfigured,
      summary,
    }),
    loadError: null,
  };
}
