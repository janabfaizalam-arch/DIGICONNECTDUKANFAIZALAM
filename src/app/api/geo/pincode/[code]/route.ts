import { NextResponse } from "next/server";

import { isValidPincode, parsePincodeResponse, type PincodeLocation } from "@/lib/geo/pincode-core";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UPSTREAM = "https://api.postalpincode.in/pincode";
const TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Pincode data is effectively static, so one upstream call per pincode per day
 * is plenty. Proxying rather than calling India Post from the browser also
 * keeps the signup form working if they block cross-origin requests.
 */
const cache = new Map<string, { value: PincodeLocation | null; expires: number }>();

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const pincode = String(code ?? "").trim();

  if (!isValidPincode(pincode)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid 6-digit pincode." },
      { status: 400 },
    );
  }

  const rate = checkRateLimit(`pincode:${getClientIp(_request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const cached = cache.get(pincode);
  if (cached && cached.expires > Date.now()) {
    return cached.value
      ? NextResponse.json({ ok: true, location: cached.value, cached: true })
      : NextResponse.json({ ok: false, error: "No location found for this pincode." }, { status: 404 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${UPSTREAM}/${encodeURIComponent(pincode)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn("[pincode] upstream_status", { pincode, status: response.status });
      return NextResponse.json(
        { ok: false, error: "Pincode lookup is unavailable right now. Please type your city manually." },
        { status: 502 },
      );
    }

    const location = parsePincodeResponse(await response.json(), pincode);
    cache.set(pincode, { value: location, expires: Date.now() + CACHE_TTL_MS });

    if (!location) {
      return NextResponse.json({ ok: false, error: "No location found for this pincode." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.warn("[pincode] lookup_failed", { pincode, aborted });
    // A lookup failure must never block signup — the form falls back to manual entry.
    return NextResponse.json(
      { ok: false, error: "Pincode lookup is unavailable right now. Please type your city manually." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
