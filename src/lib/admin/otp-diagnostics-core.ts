/**
 * Classification of a stored OTP attempt.
 *
 * The distinction that matters operationally: AiSensy returning `success=true`
 * only means it ACCEPTED the submit. WhatsApp delivery is a separate, later
 * fact that arrives on the delivery webhook. Treating "accepted" as "delivered"
 * is what makes a broken campaign look healthy from inside the app.
 */
export type OtpAttemptVerdict =
  | "delivered"
  | "failed_at_whatsapp"
  | "rejected_by_provider"
  | "accepted_only"
  | "in_flight";

export type OtpAttemptClassification = {
  verdict: OtpAttemptVerdict;
  label: string;
  /** True when this attempt proves nothing about whether the customer got it. */
  unknownDelivery: boolean;
  tone: "good" | "bad" | "warn" | "muted";
  detail: string | null;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const DELIVERED_STATUSES = new Set(["delivered", "read"]);
const FAILED_STATUSES = new Set(["failed", "undelivered", "rejected", "error"]);

/**
 * Decide what a single `auth_otp_requests.metadata` blob actually tells us.
 *
 * Precedence is deliberate: a delivery webhook overrides our own optimistic
 * "sent", because only the webhook reports what WhatsApp did.
 */
export function classifyOtpAttempt(metadata: unknown): OtpAttemptClassification {
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  const webhookStatus = str(meta.provider_delivery_status)?.toLowerCase() ?? null;
  const storedStatus = str(meta.delivery_status)?.toLowerCase() ?? null;
  const webhookError = str(meta.provider_delivery_error);
  const webhookErrorCode = str(meta.provider_delivery_error_code);
  const submitError = str(meta.provider_detail) ?? str(meta.provider_code);

  if (webhookStatus && DELIVERED_STATUSES.has(webhookStatus)) {
    return {
      verdict: "delivered",
      label: "Delivered on WhatsApp",
      unknownDelivery: false,
      tone: "good",
      detail: null,
    };
  }

  if (webhookStatus && FAILED_STATUSES.has(webhookStatus)) {
    return {
      verdict: "failed_at_whatsapp",
      label: "WhatsApp rejected it",
      unknownDelivery: false,
      tone: "bad",
      detail: [webhookErrorCode, webhookError].filter(Boolean).join(" · ") || null,
    };
  }

  if (storedStatus === "failed") {
    return {
      verdict: "rejected_by_provider",
      label: "AiSensy refused the send",
      unknownDelivery: false,
      tone: "bad",
      detail: submitError,
    };
  }

  if (storedStatus === "sent") {
    return {
      verdict: "accepted_only",
      label: "Submitted — delivery unknown",
      unknownDelivery: true,
      tone: "warn",
      detail: "AiSensy accepted the request. Nothing has confirmed WhatsApp delivered it.",
    };
  }

  return {
    verdict: "in_flight",
    label: "Not submitted yet",
    unknownDelivery: true,
    tone: "muted",
    detail: null,
  };
}

export type OtpAttemptSummary = {
  total: number;
  delivered: number;
  failedAtWhatsapp: number;
  rejectedByProvider: number;
  acceptedOnly: number;
};

export function summariseOtpAttempts(
  attempts: Array<{ classification: OtpAttemptClassification }>,
): OtpAttemptSummary {
  const summary: OtpAttemptSummary = {
    total: attempts.length,
    delivered: 0,
    failedAtWhatsapp: 0,
    rejectedByProvider: 0,
    acceptedOnly: 0,
  };

  for (const { classification } of attempts) {
    if (classification.verdict === "delivered") summary.delivered += 1;
    else if (classification.verdict === "failed_at_whatsapp") summary.failedAtWhatsapp += 1;
    else if (classification.verdict === "rejected_by_provider") summary.rejectedByProvider += 1;
    else if (classification.verdict === "accepted_only") summary.acceptedOnly += 1;
  }

  return summary;
}

export type OtpHealthVerdict = {
  severity: "ok" | "blind" | "broken" | "misconfigured" | "idle";
  headline: string;
  explanation: string;
  /** Ordered, most-likely-first. Empty when nothing is wrong. */
  nextSteps: string[];
};

/**
 * Turn config + recent attempts into the one sentence an operator needs.
 *
 * The "blind" case is the important one and the reason this screen exists: every
 * send is accepted and nothing is ever confirmed, which is indistinguishable
 * from a totally broken campaign unless the delivery webhook is wired up.
 */
export function assessOtpHealth(input: {
  apiKeyConfigured: boolean;
  signupCampaignConfigured: boolean;
  webhookSecretConfigured: boolean;
  summary: OtpAttemptSummary;
}): OtpHealthVerdict {
  if (!input.apiKeyConfigured || !input.signupCampaignConfigured) {
    return {
      severity: "misconfigured",
      headline: "OTP sending is not configured",
      explanation: !input.apiKeyConfigured
        ? "AISENSY_API_KEY is missing, so no OTP can leave the server."
        : "No signup campaign is configured, so the signup OTP has nowhere to go.",
      nextSteps: [
        "Set AISENSY_API_KEY (or AISENSY_PROJECT_API_KEY) in Vercel for the Production environment.",
        "Set AISENSY_SIGNUP_CAMPAIGN to the exact Live campaign name in AiSensy.",
        "Redeploy — environment variables are read at runtime on the server.",
      ],
    };
  }

  const { summary } = input;

  if (summary.total === 0) {
    return {
      severity: "idle",
      headline: "No signup OTP attempts recorded yet",
      explanation: "Configuration looks complete. Run a test send below to produce a real attempt.",
      nextSteps: [],
    };
  }

  if (summary.failedAtWhatsapp > 0) {
    return {
      severity: "broken",
      headline: "WhatsApp is rejecting the OTP messages",
      explanation:
        "AiSensy accepted these sends but WhatsApp refused to deliver them. The reason code is shown against each attempt below — this is a template or account problem, not an app bug.",
      nextSteps: [
        "Open AiSensy → Manage → Template Message and check the signup template's status. Anything other than Approved (Rejected, Paused, Pending) is accepted by AiSensy and then dropped by WhatsApp.",
        "If it is Rejected, open it for Meta's reason. Authentication templates must use Meta's fixed wording — custom body text like \"Welcome to <brand>, your OTP is {{1}}\" is rejected on sight.",
        "Confirm the campaign itself is Live and API-enabled.",
        "Compare the campaign's Test Campaign cURL against the payload contract shown above — the templateParams count must match exactly.",
        "Check the AiSensy wallet balance and plan status.",
      ],
    };
  }

  if (summary.rejectedByProvider > 0 && summary.delivered === 0) {
    return {
      severity: "broken",
      headline: "AiSensy is refusing the sends",
      explanation:
        "The requests never reached WhatsApp. The refusal reason is recorded against each attempt below.",
      nextSteps: [
        "Verify AISENSY_API_KEY is the current Campaign API key for this AiSensy project.",
        "Verify the signup campaign name matches AiSensy exactly, including case.",
        "Check the AiSensy wallet balance and plan status.",
      ],
    };
  }

  if (!input.webhookSecretConfigured && summary.acceptedOnly > 0 && summary.delivered === 0) {
    return {
      severity: "blind",
      headline: "Every send is accepted, but nothing confirms delivery",
      explanation:
        "AISENSY_WEBHOOK_SECRET is not set, so AiSensy never tells this app what WhatsApp did. Customers reporting 'OTP nahi aaya' cannot be confirmed or ruled out from here — the app shows 'sent' either way.",
      nextSteps: [
        "First: AiSensy → Manage → Template Message. If the signup template is Rejected or Paused, that alone explains it — AiSensy accepts the send and WhatsApp discards it, with no error visible here.",
        "Set AISENSY_WEBHOOK_SECRET (16+ characters) in Vercel and redeploy.",
        "In AiSensy, point the delivery webhook at /api/webhooks/aisensy and send the same secret as the x-aisensy-webhook-secret header.",
        "Until then, confirm delivery manually in AiSensy → Campaigns → Sent using the submitted message id shown below.",
        "Check the AiSensy wallet balance — an empty balance accepts submits and never delivers.",
      ],
    };
  }

  if (summary.delivered > 0) {
    return {
      severity: "ok",
      headline: "WhatsApp delivery confirmed on recent attempts",
      explanation: `${summary.delivered} of the last ${summary.total} signup OTP attempts were confirmed delivered by WhatsApp.`,
      nextSteps: [],
    };
  }

  return {
    severity: "blind",
    headline: "Delivery is still unconfirmed",
    explanation:
      "Sends are being accepted but no delivery confirmation has arrived yet. If this stays unchanged for more than a few minutes, treat it as undelivered.",
    nextSteps: [
      "Check the signup template's status in AiSensy first — a Rejected or Paused template is the most common cause of accepted-but-never-delivered.",
      "Confirm the signup campaign is Live and API-enabled.",
      "Check the AiSensy wallet balance and plan status.",
    ],
  };
}
