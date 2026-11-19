/**
 * The verdict logic behind the payments diagnostics screen.
 *
 * Written as pure functions so the reasoning can be tested without a database:
 * given what we know about the Razorpay config and the recent payment record,
 * what is actually wrong, and what should someone do about it?
 *
 * The question this screen exists to answer is the one that is genuinely hard
 * to see from inside the app: money leaves a customer's account, the site says
 * "paid", and nothing shows up in the Razorpay dashboard. That has only a few
 * possible causes, and each leaves a different fingerprint here.
 */

export type PaymentHealthSeverity = "ok" | "idle" | "warn" | "blind" | "misconfigured";

export type PaymentHealthVerdict = {
  severity: PaymentHealthSeverity;
  headline: string;
  explanation: string;
  nextSteps: string[];
};

export type PaymentDiagnosticsInput = {
  /** Public Razorpay key id the server signs orders with, e.g. rzp_live_xxx. */
  keyId: string | null;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  /** Last time a Razorpay webhook was processed, from the records it wrote. */
  lastWebhookAt: string | null;
  /** Payments that reached `authorized` and never became `captured`. */
  stuckAuthorized: number;
  /** Orders started in the last 30 days that never reached a payment at all. */
  recentOrdersStarted: number;
  recentPaymentsCaptured: number;
  /** Paid work that never completed its settlement side-effects. */
  paidMissingInvoice: number;
  paidMissingWalletDebit: number;
  paidMissingCashback: number;
  now?: Date;
};

export function isTestKey(keyId: string | null): boolean {
  return Boolean(keyId && keyId.startsWith("rzp_test"));
}

export function isLiveKey(keyId: string | null): boolean {
  return Boolean(keyId && keyId.startsWith("rzp_live"));
}

export function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return (now.getTime() - then) / (60 * 60 * 1000);
}

export function assessPaymentHealth(input: PaymentDiagnosticsInput): PaymentHealthVerdict {
  const now = input.now ?? new Date();
  const keyId = input.keyId?.trim() || null;

  if (!keyId || !input.keySecretConfigured) {
    return {
      severity: "misconfigured",
      headline: "Razorpay is not configured, so no payment can be taken",
      explanation:
        "The server has no usable Razorpay key pair, so order creation fails and checkout cannot open.",
      nextSteps: [
        "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel, from the same Razorpay account.",
        "Redeploy, then reload this page — the key id below should show your live key.",
      ],
    };
  }

  if (isTestKey(keyId)) {
    return {
      severity: "misconfigured",
      headline: "The site is taking test payments, not real ones",
      explanation:
        "The key in use is a test key. Checkout will succeed and the app will say paid, but no money moves and nothing appears in the live dashboard — only in Razorpay's Test Mode.",
      nextSteps: [
        "Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel with the live pair.",
        "Replace RAZORPAY_WEBHOOK_SECRET with the secret of the live account's webhook.",
      ],
    };
  }

  if (!input.webhookSecretConfigured) {
    return {
      severity: "misconfigured",
      headline: "The webhook secret is missing, so Razorpay cannot confirm anything",
      explanation:
        "Every webhook delivery is rejected without it. Payments are then confirmed only while the customer's browser stays open — if they close the tab, the order never completes.",
      nextSteps: [
        "Copy the webhook secret from Razorpay → Settings → Webhooks and set RAZORPAY_WEBHOOK_SECRET in Vercel.",
        "It must belong to the same Razorpay account as the key id below.",
      ],
    };
  }

  const webhookAgeHours = hoursSince(input.lastWebhookAt, now);
  const hasRecentActivity = input.recentOrdersStarted > 0;

  if (hasRecentActivity && (webhookAgeHours === null || webhookAgeHours > 24 * 7)) {
    return {
      severity: "blind",
      headline: "No Razorpay webhook has arrived recently",
      explanation:
        "Orders are being started, but nothing has come back from Razorpay in over a week. Either the webhook is not pointing at this site, or its secret belongs to a different Razorpay account than the key below.",
      nextSteps: [
        "In Razorpay → Settings → Webhooks, check the URL is https://www.rnos.in/api/razorpay/webhook and it is active.",
        "Make sure payment.captured, payment.failed and qr_code.credited are subscribed.",
        "Confirm the webhook and the key id below belong to the same Razorpay account.",
      ],
    };
  }

  if (input.stuckAuthorized > 0) {
    return {
      severity: "warn",
      headline: `${input.stuckAuthorized} payment${input.stuckAuthorized === 1 ? "" : "s"} authorized but never captured`,
      explanation:
        "An authorization is a hold on the customer's money, not a transfer. It never reaches your account and the bank releases it after a few days. These will not appear among captured payments in the dashboard.",
      nextSteps: [
        "Check Razorpay → Account & Settings → Capture and refund settings: capture should be Automatic.",
        "Look at what 'Authorisation post 12 Mins' is set to — a late authorization follows that rule, not the automatic one.",
      ],
    };
  }

  const settlementGaps =
    input.paidMissingInvoice + input.paidMissingWalletDebit + input.paidMissingCashback;

  if (settlementGaps > 0) {
    return {
      severity: "warn",
      headline: "Some paid orders never finished settling",
      explanation:
        "The money arrived, but an invoice, a wallet debit or cashback is missing on some of them. New payments complete all of this automatically; these are older orders from before that was true.",
      nextSteps: [
        "Use Payments → Reconciliation to sync the affected days against Razorpay.",
        "The counts below show exactly how many orders of each kind are affected.",
      ],
    };
  }

  if (input.recentPaymentsCaptured === 0 && !hasRecentActivity) {
    return {
      severity: "idle",
      headline: "Nothing to report — no payment activity recently",
      explanation: "Razorpay is configured and the webhook is reachable, but no orders have been started lately.",
      nextSteps: [],
    };
  }

  return {
    severity: "ok",
    headline: "Payments are flowing and confirming normally",
    explanation:
      "Orders are being created on a live key, Razorpay is delivering webhooks, captured payments are being recorded, and every paid order has completed its settlement.",
    nextSteps: [],
  };
}

/** Where the money for an authorized-but-uncaptured payment actually sits. */
export const AUTHORIZED_MONEY_EXPLAINER =
  "Authorized means the bank placed a hold and nothing was transferred. The money is still with the customer's bank and is released automatically if the payment is never captured — it never reaches your Razorpay balance, so it cannot appear in settlements.";
