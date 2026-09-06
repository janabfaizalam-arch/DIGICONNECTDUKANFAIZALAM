/**
 * Every way an outside system can let this engine down, named.
 *
 * Seven external surfaces are involved here — a model, Canva, and five
 * publishing APIs — and the failure that matters most is the quiet one: a
 * publish that returned 500 and got logged as done. So nothing in this engine
 * calls `fetch` directly. Calls go through `callExternal`, which times out,
 * retries the failures worth retrying, backs off between attempts, and turns
 * whatever came back into one of the codes below.
 *
 * The codes exist so an administrator reads "Instagram ka connection expire
 * ho gaya" instead of a stack trace, and so a token never travels into a
 * response body inside an error message.
 */

export const EXTERNAL_FAILURES = [
  "not_configured",
  "auth_expired",
  "rate_limited",
  "unavailable",
  "timeout",
  "invalid_content",
  "unsupported",
  "upstream",
] as const;

export type ExternalFailure = (typeof EXTERNAL_FAILURES)[number];

/** What the admin sees. One sentence, and it says what to do about it. */
export const FAILURE_MESSAGE: Record<ExternalFailure, string> = {
  not_configured:
    "This integration is not connected yet. Add its credentials in Settings before using it.",
  auth_expired: "The connection to this platform has expired. Reconnect it in Settings.",
  rate_limited: "The platform is rate limiting us. It will be retried automatically in a while.",
  unavailable: "The platform is not responding right now. Nothing was published.",
  timeout: "The platform took too long to answer. Nothing was published.",
  invalid_content: "The platform refused this content. Open the post and check the caption, media and links.",
  unsupported: "This platform's API does not support that action.",
  upstream: "Something went wrong at the platform's end. Nothing was published.",
};

/** Retrying an expired token just spends the rate limit. Only these are worth a second go. */
const RETRYABLE: ExternalFailure[] = ["rate_limited", "unavailable", "timeout", "upstream"];

export function isRetryable(failure: ExternalFailure): boolean {
  return RETRYABLE.includes(failure);
}

export class ExternalError extends Error {
  readonly failure: ExternalFailure;
  /** The service, for the log line. Never carries a credential. */
  readonly service: string;
  readonly status: number | null;

  constructor(service: string, failure: ExternalFailure, message: string, status: number | null = null) {
    super(message);
    this.name = "ExternalError";
    this.service = service;
    this.failure = failure;
    this.status = status;
  }

  /** What is safe to put in an API response. */
  toPublic(): { service: string; failure: ExternalFailure; message: string } {
    return { service: this.service, failure: this.failure, message: FAILURE_MESSAGE[this.failure] };
  }
}

/**
 * An HTTP status, as a failure.
 *
 * 401 and 403 are told apart from 429 because they need different actions
 * from a human: one is "reconnect", the other is "wait".
 */
export function failureForStatus(status: number): ExternalFailure {
  if (status === 401 || status === 403) return "auth_expired";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) return "invalid_content";
  if (status === 404 || status === 405 || status === 501) return "unsupported";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "unavailable";
  return "upstream";
}

export function classifyExternal(caught: unknown, service: string): ExternalError {
  if (caught instanceof ExternalError) return caught;

  if (caught instanceof DOMException && caught.name === "AbortError") {
    return new ExternalError(service, "timeout", "Aborted after the timeout.");
  }

  const status =
    typeof caught === "object" && caught !== null && "status" in caught
      ? Number((caught as { status?: unknown }).status)
      : Number.NaN;
  const text = caught instanceof Error ? caught.message : String(caught ?? "");

  if (Number.isFinite(status) && status > 0) {
    return new ExternalError(service, failureForStatus(status), redact(text), status);
  }
  if (/abort|timed? ?out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(text)) {
    return new ExternalError(service, "timeout", redact(text));
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|fetch failed|network/i.test(text)) {
    return new ExternalError(service, "unavailable", redact(text));
  }
  if (/unauthor|forbidden|invalid[_ ]?token|expired|PERMISSION_DENIED|UNAUTHENTICATED/i.test(text)) {
    return new ExternalError(service, "auth_expired", redact(text));
  }
  if (/quota|rate limit|RESOURCE_EXHAUSTED|too many requests/i.test(text)) {
    return new ExternalError(service, "rate_limited", redact(text));
  }
  return new ExternalError(service, "upstream", redact(text));
}

/**
 * Strip anything credential-shaped out of text about to be logged.
 *
 * Platform SDKs put the request URL into error messages and several of these
 * APIs carry the access token as a query parameter, so the obvious
 * `console.error(error.message)` writes a live Instagram token into a hosting
 * provider's log where it sits for as long as the log is kept.
 */
export function redact(text: string): string {
  return (text ?? "")
    .replace(/([?&](?:access_token|key|api[_-]?key|token|secret|password)=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/\bEAA[A-Za-z0-9]{20,}/g, "[redacted]")
    .slice(0, 500);
}

/* ─────────────────────────────────────────────────────────────────────────
   Making the call
   ───────────────────────────────────────────────────────────────────────── */

export type CallOptions = {
  service: string;
  /** Names the operation in logs: "publish", "fetch analytics". */
  operation: string;
  timeoutMs: number;
  maxAttempts: number;
  /** Base delay; each attempt waits this doubled, plus jitter. */
  backoffMs?: number;
  /** Injected in tests so a retry test does not actually sleep. */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run an external call with a timeout, retries and exponential backoff.
 *
 * The signal is handed to the callee rather than the call being raced against
 * a timer, so a timeout actually cancels the request instead of abandoning it
 * to finish in the background and publish twice.
 */
export async function callExternal<T>(
  run: (signal: AbortSignal) => Promise<T>,
  options: CallOptions,
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const backoff = options.backoffMs ?? 500;
  let last: ExternalError | null = null;

  for (let attempt = 1; attempt <= Math.max(1, options.maxAttempts); attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      return await run(controller.signal);
    } catch (caught) {
      last = classifyExternal(caught, options.service);
      const canRetry = isRetryable(last.failure) && attempt < options.maxAttempts;

      console.warn("[content-engine] external call failed", {
        service: options.service,
        operation: options.operation,
        failure: last.failure,
        status: last.status,
        attempt,
        willRetry: canRetry,
        detail: redact(last.message),
      });

      if (!canRetry) throw last;
      // Jitter so a rate limit does not resynchronise every retry in a batch.
      await sleep(backoff * 2 ** (attempt - 1) + Math.floor(Math.random() * 200));
    } finally {
      clearTimeout(timer);
    }
  }

  throw last ?? new ExternalError(options.service, "upstream", "Call failed with no error recorded.");
}
