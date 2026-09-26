import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

type LegacyReport = { "csp-report"?: Record<string, unknown> };
type ReportingApiReport = { type?: string; body?: Record<string, unknown> };

/** Host only: a blocked URL can carry tokens or personal data in its path or query. */
function hostOf(value: unknown) {
  const raw = String(value ?? "");
  if (!raw || !raw.includes("://")) return raw.slice(0, 40) || null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

function pathOf(value: unknown) {
  try {
    return new URL(String(value ?? "")).pathname.slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * Where browsers send Content-Security-Policy violations.
 *
 * Public by necessity — browsers post here without credentials — so it takes
 * nothing it does not need, stores nothing, rate-limits per IP, and logs only
 * the directive, the blocked host and the page path. That is enough to see
 * which third party the policy would break before switching CSP_ENFORCE on.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  const rate = checkRateLimit(`csp-report:${getClientIp(request)}`, 30, 60_000);
  if (!rate.ok) return noContent;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return noContent;

  try {
    const text = (await request.text()).slice(0, MAX_BODY_BYTES);
    const parsed = JSON.parse(text) as LegacyReport | ReportingApiReport[];
    const reports = Array.isArray(parsed)
      ? parsed.filter((r) => r?.type === "csp-violation").map((r) => r.body ?? {})
      : [parsed["csp-report"] ?? {}];

    for (const report of reports.slice(0, 5)) {
      console.warn("[csp-violation]", {
        directive: String(report["effective-directive"] ?? report.effectiveDirective ?? report["violated-directive"] ?? "").slice(0, 60),
        blocked: hostOf(report["blocked-uri"] ?? report.blockedURL),
        page: pathOf(report["document-uri"] ?? report.documentURL),
        disposition: String(report.disposition ?? "").slice(0, 12),
      });
    }
  } catch {
    // Malformed reports are ignored.
  }

  return noContent;
}
