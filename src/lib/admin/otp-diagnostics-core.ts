/**
 * Classification of a stored OTP attempt.
 *
 * The distinction that matters operationally: Meta's Cloud API returning a
 * message id only means it ACCEPTED the send. WhatsApp delivery is a separate,
 * later fact that arrives on the Meta webhook. Treating "accepted" as
 * "delivered" is what makes a broken template look healthy from inside the app.
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
      label: "Meta refused the send",
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
      detail: "Meta accepted the request. Nothing has confirmed WhatsApp delivered it.",
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
 * from a totally broken template unless the delivery webhook is wired up.
 */
export function assessOtpHealth(input: {
  accessTokenConfigured: boolean;
  signupTemplateConfigured: boolean;
  webhookSecretConfigured: boolean;
  summary: OtpAttemptSummary;
}): OtpHealthVerdict {
  if (!input.accessTokenConfigured || !input.signupTemplateConfigured) {
    return {
      severity: "misconfigured",
      headline: "OTP sending is not configured",
      explanation: !input.accessTokenConfigured
        ? "META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_PHONE_NUMBER_ID is missing, so no OTP can leave the server."
        : "No signup template is configured, so the signup OTP has nowhere to go.",
      nextSteps: [
        "Set META_WHATSAPP_ACCESS_TOKEN (System User permanent token) and META_WHATSAPP_PHONE_NUMBER_ID in Vercel for the Production environment.",
        "Create and get approved the `signup_otp` Authentication template in WhatsApp Manager (or set WHATSAPP_TEMPLATE_SIGNUP_OTP to the approved name).",
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
        "Meta accepted these sends but WhatsApp refused to deliver them. The reason code is shown against each attempt below — this is a template or account problem, not an app bug.",
      nextSteps: [
        "Open WhatsApp Manager → Message templates and check the signup template's status. Anything other than Approved (Rejected, Paused, Pending) will not be delivered.",
        "If it is Rejected, open it for Meta's reason. Authentication templates must use Meta's fixed wording — custom body text like \"Welcome to <brand>, your OTP is {{1}}\" is rejected on sight.",
        "Check the template's language matches META_WHATSAPP_TEMPLATE_LANGUAGE (or WHATSAPP_TEMPLATE_SIGNUP_OTP_LANGUAGE) exactly — en and en_US are different templates to Meta.",
        "Check WhatsApp Manager → Overview for the number's quality rating, messaging limit and a valid payment method."
      ],
    };
  }

  if (summary.rejectedByProvider > 0 && summary.delivered === 0) {
    return {
      severity: "broken",
      headline: "Meta is refusing the sends",
      explanation:
        "The requests never reached WhatsApp. The refusal reason is recorded against each attempt below.",
      nextSteps: [
        "Verify META_WHATSAPP_ACCESS_TOKEN is a current System User token with whatsapp_business_messaging permission (error 190 = expired token).",
        "Verify the signup template name and language match WhatsApp Manager exactly, including case (error 132001 = template not found).",
        "Check WhatsApp Manager → Overview for account restrictions and a valid payment method.",
      ],
    };
  }

  if (!input.webhookSecretConfigured && summary.acceptedOnly > 0 && summary.delivered === 0) {
    return {
      severity: "blind",
      headline: "Every send is accepted, but nothing confirms delivery",
      explanation:
        "META_APP_SECRET is not set, so the Meta webhook's delivery reports are refused and this app never learns what WhatsApp did. Customers reporting 'OTP nahi aaya' cannot be confirmed or ruled out from here — the app shows 'sent' either way.",
      nextSteps: [
        "First: WhatsApp Manager → Message templates. If the signup template is Rejected or Paused, that alone explains it.",
        "Set META_APP_SECRET (Meta app → App settings → Basic → App secret) in Vercel and redeploy.",
        "Make sure the app's webhook points at /api/webhooks/meta-whatsapp with the messages field subscribed.",
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
      "Check the signup template's status in WhatsApp Manager first — a Rejected or Paused template is the most common cause of accepted-but-never-delivered.",
      "Check the Meta webhook is subscribed to the messages field so delivery reports arrive.",
      "Check WhatsApp Manager → Overview for quality rating and messaging limits.",
    ],
  };
}
