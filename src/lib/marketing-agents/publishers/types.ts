import { redact, type SocialPlatformId } from "@/lib/marketing-agents/config";

export type PublishInput = {
  /** Final text, link and hashtags already composed for this platform. */
  text: string;
  /** Tracked link to the website for platforms that take a separate link field. */
  link: string;
  title: string;
  description: string;
  /** Public URL of the poster, if one was drawn. */
  imageUrl: string | null;
  /** A JPEG copy of the poster (from Facebook), preferred by Instagram. */
  jpegImageUrl?: string | null;
};

export type PublishResult = {
  platform: SocialPlatformId;
  status: "posted" | "skipped" | "failed";
  postId?: string;
  postUrl?: string;
  /** Returned by Facebook for Instagram's benefit. */
  jpegImageUrl?: string;
  error?: string;
};

export class PublishError extends Error {
  constructor(message: string) {
    super(redact(message));
    this.name = "PublishError";
  }
}

const TIMEOUT_MS = 30_000;

/**
 * `fetch` that returns parsed JSON or throws a `PublishError` carrying the
 * platform's own error message — never the request URL, which for Telegram
 * contains the bot token.
 */
export async function requestJson<T = Record<string, unknown>>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new PublishError(controller.signal.aborted ? "Request timed out." : "Network error reaching the platform.");
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new PublishError(`HTTP ${response.status}: ${platformErrorMessage(body) || raw.slice(0, 300)}`);
  }
  return (body ?? {}) as T;
}

function platformErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  for (const key of ["message", "description", "detail", "title", "error"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  if (Array.isArray(record.errors) && record.errors[0] && typeof record.errors[0] === "object") {
    const first = record.errors[0] as Record<string, unknown>;
    if (typeof first.message === "string") return first.message;
  }
  return "";
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
