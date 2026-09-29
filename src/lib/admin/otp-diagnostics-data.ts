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
  isWhatsAppConfigured,
  resolveOtpTemplate,
  type OtpPayloadContract,
} from "@/lib/whatsapp/client";

const ATTEMPT_LIMIT = 25;

export type OtpAttemptRow = {
  id: string;
  purpose: string;
  phoneMasked: string;
  createdAt: string | null;
  template: string | null;
  submittedMessageId: string | null;
  classification: OtpAttemptClassification;
};

export type OtpDiagnostics = {
  config: {
    accessTokenConfigured: boolean;
    phoneNumberId: string | null;
    signupTemplate: string | null;
    signupTemplateLanguage: string | null;
    signupTemplateSource: string | null;
    signupTemplateConfigured: boolean;
    loginTemplateConfigured: boolean;
    resetTemplateConfigured: boolean;
    webhookSecretConfigured: boolean;
    environment: string;
    payloadContract: OtpPayloadContract;
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
  const signup = resolveOtpTemplate("customer_signup");
  const login = resolveOtpTemplate("login");
  const reset = resolveOtpTemplate("forgot_pin");

  const accessTokenConfigured = isWhatsAppConfigured();
  const webhookSecretConfigured = Boolean(process.env.META_APP_SECRET?.trim());

  const config: OtpDiagnostics["config"] = {
    accessTokenConfigured,
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    signupTemplate: signup.ok ? signup.templateName : null,
    signupTemplateLanguage: signup.ok ? signup.language : null,
    signupTemplateSource: signup.ok ? signup.source : null,
    signupTemplateConfigured: signup.ok,
    loginTemplateConfigured: login.ok,
    resetTemplateConfigured: reset.ok,
    webhookSecretConfigured,
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
        accessTokenConfigured,
        signupTemplateConfigured: signup.ok,
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
        accessTokenConfigured,
        signupTemplateConfigured: signup.ok,
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
    // `campaign` is how rows written before the Meta switch named it.
    template: metaString(row.metadata, "template") ?? metaString(row.metadata, "campaign"),
    submittedMessageId: metaString(row.metadata, "submitted_message_id"),
    classification: classifyOtpAttempt(row.metadata),
  }));

  // Health is judged on signup only — a healthy reset flow must not mask a
  // broken signup template, since they are different Meta templates.
  const signupAttempts = attempts.filter((attempt) => attempt.purpose === "customer_signup");
  const summary = summariseOtpAttempts(signupAttempts);

  return {
    config,
    attempts,
    summary,
    health: assessOtpHealth({
      accessTokenConfigured,
      signupTemplateConfigured: signup.ok,
      webhookSecretConfigured,
      summary,
    }),
    loadError: null,
  };
}
