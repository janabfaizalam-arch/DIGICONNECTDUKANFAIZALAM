import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  current.count += 1;

  if (current.count > limit) {
    return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly.", message: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
