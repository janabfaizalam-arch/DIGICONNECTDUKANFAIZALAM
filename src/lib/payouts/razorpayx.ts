import "server-only";

import crypto from "crypto";

/**
 * Sending money out, through RazorpayX.
 *
 * The Razorpay account this shop already has takes money in. It cannot send
 * money out: payouts are RazorpayX, a separate product with its own activation
 * and its own API keys, and the `razorpay` npm package does not cover it at
 * all (its `resources/` has orders, payments and fundAccount, and no payouts).
 * So this talks to the REST API directly, and reads its own credentials --
 * pointing it at `RAZORPAY_KEY_ID` would authenticate and then fail on every
 * call, which is a confusing way to find out the two are different.
 *
 * Everything here runs on the server. `server-only` above turns an accidental
 * client import into a build error rather than a key that can move money
 * sitting in a JavaScript bundle.
 *
 * Nothing in this module decides *whether* to pay anybody. It is given an
 * amount and a destination and it calls Razorpay; the wallet, the balance
 * check and the mode switch are the caller's.
 */

const API = "https://api.razorpay.com/v1";

/** Long enough for a bank API, short enough that a request cannot hang a route. */
const TIMEOUT_MS = 20_000;

/**
 * How payouts behave on this deployment. Fail-closed, like the marketing
 * agents: anything other than an exact `auto` means no money is sent, because
 * a typo in an environment variable must not be able to start paying people.
 *
 *   disabled — the partner's request is queued for an admin, as before.
 *   auto     — the request is sent to RazorpayX straight away.
 */
export type PayoutMode = "disabled" | "auto";

export function resolvePayoutMode(raw = process.env.RAZORPAYX_PAYOUT_MODE): PayoutMode {
  return String(raw ?? "").trim().toLowerCase() === "auto" ? "auto" : "disabled";
}

export type RazorpayXConfig = {
  keyId: string;
  keySecret: string;
  /** The RazorpayX account the money leaves from -- never a partner's account. */
  accountNumber: string;
};

export function readRazorpayXConfig(source: NodeJS.ProcessEnv = process.env): RazorpayXConfig | null {
  const keyId = (source.RAZORPAYX_KEY_ID ?? "").trim();
  const keySecret = (source.RAZORPAYX_KEY_SECRET ?? "").trim();
  const accountNumber = (source.RAZORPAYX_ACCOUNT_NUMBER ?? "").trim();
  if (!keyId || !keySecret || !accountNumber) return null;
  return { keyId, keySecret, accountNumber };
}

export type PayoutFailure =
  | "not_configured"
  | "bad_key"
  | "insufficient_funds"
  | "invalid_account"
  | "rate_limited"
  | "timeout"
  | "upstream";

export class PayoutError extends Error {
  readonly failure: PayoutFailure;
  /** True when the same call can be retried without paying twice. */
  readonly retryable: boolean;

  constructor(failure: PayoutFailure, message: string, retryable = false) {
    super(message);
    this.name = "PayoutError";
    this.failure = failure;
    this.retryable = retryable;
  }
}

/**
 * Scrub anything key-shaped out of text that is about to be logged.
 *
 * The same reasoning as the Gemini module: Razorpay echoes request details in
 * some errors, and `console.error(error.message)` is a way to write a key that
 * can move money into a hosting provider's log.
 */
export function redactPayoutSecrets(text: string, source: NodeJS.ProcessEnv = process.env): string {
  let clean = text;
  for (const name of ["RAZORPAYX_KEY_ID", "RAZORPAYX_KEY_SECRET", "RAZORPAYX_ACCOUNT_NUMBER"]) {
    const value = (source[name] ?? "").trim();
    if (value && value.length >= 6) clean = clean.split(value).join("[redacted]");
  }
  return clean.replace(/\b(rzp_(?:live|test)_[A-Za-z0-9]+)/g, "[redacted]");
}

/** Which failure an HTTP status and Razorpay error body represent. */
export function classifyPayoutFailure(status: number, body: unknown): PayoutFailure {
  const description = String(
    (typeof body === "object" && body !== null
      ? ((body as { error?: { description?: unknown } }).error?.description ?? "")
      : ""),
  );

  if (status === 401 || status === 403) return "bad_key";
  if (status === 429) return "rate_limited";
  if (/insufficient|low balance|not enough/i.test(description)) return "insufficient_funds";
  if (/invalid.*(account|ifsc|vpa)|account.*invalid|beneficiary/i.test(description)) return "invalid_account";
  if (status === 400) return "invalid_account";
  return "upstream";
}

async function call<T>(
  config: RazorpayXConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  /*
    Razorpay dedupes a payout by this header, so a retry after a timeout
    returns the original payout instead of sending the money a second time.
    This is the difference between a network blip and paying a partner twice.
  */
  if (init.idempotencyKey) headers["X-Payout-Idempotency"] = init.idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API}${path}`, {
      method: init.method,
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const failure = classifyPayoutFailure(response.status, parsed);
      const description = String(
        (typeof parsed === "object" && parsed !== null
          ? ((parsed as { error?: { description?: unknown } }).error?.description ?? text)
          : text) || `HTTP ${response.status}`,
      );
      /* A 5xx or a rate limit may succeed on a retry; a rejected account or a
         bad key will not, and retrying those just burns the partner's time. */
      const retryable = response.status >= 500 || failure === "rate_limited";
      throw new PayoutError(failure, redactPayoutSecrets(description), retryable);
    }

    return parsed as T;
  } catch (caught) {
    if (caught instanceof PayoutError) throw caught;
    if (caught instanceof Error && caught.name === "AbortError") {
      /* A timeout is the dangerous case: Razorpay may well have accepted the
         payout. Retryable only because the idempotency key makes the retry
         safe -- without it this would have to be left for a human. */
      throw new PayoutError("timeout", "RazorpayX did not answer in time.", true);
    }
    throw new PayoutError("upstream", redactPayoutSecrets(caught instanceof Error ? caught.message : String(caught)), true);
  } finally {
    clearTimeout(timer);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Contacts and fund accounts
   ───────────────────────────────────────────────────────────────────────── */

export type BankDetails = {
  accountHolderName: string;
  accountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
};

/**
 * A stable fingerprint of the details a fund account was built from.
 *
 * A fund account at Razorpay is immutable, so when a partner edits their
 * account number the old fund account still points at the old bank. Storing a
 * hash of what it was built from is how the caller notices and builds a new
 * one, instead of paying the previous account forever.
 */
export function bankFingerprint(bank: BankDetails): string {
  const material = [
    bank.accountHolderName.trim().toLowerCase(),
    (bank.accountNumber ?? "").trim(),
    (bank.ifsc ?? "").trim().toUpperCase(),
    (bank.upiId ?? "").trim().toLowerCase(),
  ].join("|");
  return crypto.createHash("sha256").update(material).digest("hex").slice(0, 32);
}

/**
 * Enough to pay somebody, or a reason why not.
 *
 * Razorpay does not check that an account number belongs to the person named
 * on it, so a typo pays a stranger and the money is gone. This cannot fix
 * that; it only refuses the cases that are certainly wrong -- an IFSC that is
 * not an IFSC, an account number that is too short to be one -- so the obvious
 * mistakes do not reach the bank.
 */
export function validateBankDetails(bank: BankDetails): { ok: true } | { ok: false; error: string } {
  if (!bank.accountHolderName.trim()) {
    return { ok: false, error: "Account holder ka naam missing hai." };
  }

  const upi = (bank.upiId ?? "").trim();
  if (upi) {
    if (!/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
      return { ok: false, error: "UPI ID theek nahi lag rahi." };
    }
    return { ok: true };
  }

  const account = (bank.accountNumber ?? "").trim();
  const ifsc = (bank.ifsc ?? "").trim().toUpperCase();

  if (!account || !ifsc) {
    return { ok: false, error: "Bank account number aur IFSC dono chahiye." };
  }
  if (!/^\d{6,18}$/.test(account)) {
    return { ok: false, error: "Bank account number theek nahi lag raha." };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return { ok: false, error: "IFSC code theek nahi lag raha." };
  }
  return { ok: true };
}

export async function createContact(
  config: RazorpayXConfig,
  input: { name: string; referenceId: string; email?: string | null; contact?: string | null },
): Promise<{ id: string }> {
  return call<{ id: string }>(config, "/contacts", {
    method: "POST",
    body: {
      name: input.name,
      type: "vendor",
      reference_id: input.referenceId,
      ...(input.email ? { email: input.email } : {}),
      ...(input.contact ? { contact: input.contact } : {}),
    },
  });
}

export async function createFundAccount(
  config: RazorpayXConfig,
  input: { contactId: string; bank: BankDetails },
): Promise<{ id: string }> {
  const upi = (input.bank.upiId ?? "").trim();

  const body = upi
    ? {
        contact_id: input.contactId,
        account_type: "vpa",
        vpa: { address: upi },
      }
    : {
        contact_id: input.contactId,
        account_type: "bank_account",
        bank_account: {
          name: input.bank.accountHolderName.trim(),
          ifsc: (input.bank.ifsc ?? "").trim().toUpperCase(),
          account_number: (input.bank.accountNumber ?? "").trim(),
        },
      };

  return call<{ id: string }>(config, "/fund_accounts", { method: "POST", body });
}

/* ─────────────────────────────────────────────────────────────────────────
   The payout
   ───────────────────────────────────────────────────────────────────────── */

export type PayoutResult = {
  id: string;
  status: string;
  amountPaise: number;
};

/**
 * Send one payout.
 *
 * `amount` is rupees here and paise at Razorpay; the conversion lives in this
 * one place because getting it wrong in either direction is a hundredfold
 * error with real money.
 *
 * `idempotencyKey` should be our own payout row id. Razorpay then treats a
 * retry of the same request as the same payout, which is what makes it safe
 * to retry after a timeout.
 */
export async function createPayout(
  config: RazorpayXConfig,
  input: {
    fundAccountId: string;
    amountRupees: number;
    idempotencyKey: string;
    referenceId: string;
    narration?: string;
    useUpi?: boolean;
  },
): Promise<PayoutResult> {
  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new PayoutError("upstream", "Payout amount must be greater than zero.");
  }

  const payout = await call<{ id: string; status?: string; amount?: number }>(config, "/payouts", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      account_number: config.accountNumber,
      fund_account_id: input.fundAccountId,
      amount: amountPaise,
      currency: "INR",
      mode: input.useUpi ? "UPI" : "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: input.referenceId,
      // Razorpay caps this at 30 characters and rejects most punctuation.
      narration: (input.narration ?? "DigiConnect payout").slice(0, 30),
    },
  });

  return {
    id: String(payout.id),
    status: String(payout.status ?? "processing"),
    amountPaise: Number(payout.amount ?? amountPaise),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   What the webhook says
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Where a Razorpay payout status leaves our payout.
 *
 * `reversed` is the one that catches people out: the money left, the bank sent
 * it back, and it must return to the partner's wallet exactly as a failure
 * does -- otherwise the partner is shown as paid for money they never got.
 */
export type PayoutOutcome = "pending" | "paid" | "failed";

export function outcomeForRazorpayStatus(status: string | undefined): PayoutOutcome {
  switch (String(status ?? "").toLowerCase()) {
    case "processed":
      return "paid";
    case "cancelled":
    case "rejected":
    case "failed":
    case "reversed":
      return "failed";
    default:
      /* queued, pending, processing, and anything new Razorpay introduces:
         leave the money held and wait for a later webhook. */
      return "pending";
  }
}

/** RazorpayX signs its webhooks the same way, with its own secret. */
export function verifyPayoutWebhook(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
