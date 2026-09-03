import { NextResponse } from "next/server";

import {
  classifySource,
  dailyVisitorHash,
  deviceFromUserAgent,
  isBotUserAgent,
  isSelfReferral,
  isTrackablePath,
  normalisePath,
  referrerHost,
  utcDay,
} from "@/lib/analytics/visit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * One page view, on its way to the admin panel's own analytics.
 *
 * Public and unauthenticated, because the people it counts are strangers. It
 * therefore takes nothing from the caller that it is not willing to publish:
 * a path, a page title, a referrer and a session id are all it reads, and
 * everything that says *where* and *on what* is taken from headers the browser
 * cannot forge into something dangerous.
 *
 * It answers 204 whatever happens. A visitor's page must never be slowed, and
 * must certainly never break, because the analytics table was busy.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  try {
    const userAgent = request.headers.get("user-agent");
    // Crawlers would otherwise fill the panel with visits nobody made.
    if (isBotUserAgent(userAgent)) return noContent;

    const ip = getClientIp(request);
    /*
      Generous, because a real person reading a site produces bursts — a
      landing page, a service, back, a form — and mean, because one script
      should not be able to invent a busy afternoon.
    */
    const rate = checkRateLimit(`track:${ip}`, 60, 60_000);
    if (!rate.ok) return noContent;

    const body = (await request.json().catch(() => null)) as {
      path?: string;
      title?: string;
      referrer?: string;
      sessionId?: string;
      campaign?: string;
      utmSource?: string;
      isEntry?: boolean;
    } | null;

    const path = normalisePath(body?.path);
    if (!path || !isTrackablePath(path)) return noContent;

    const supabase = getSupabaseAdmin();
    if (!supabase) return noContent;

    const siteHost = new URL(getSiteUrl()).hostname;
    const referrer = String(body?.referrer ?? "");
    // Moving between our own pages is not an arrival from anywhere.
    const external = referrer && !isSelfReferral(referrer, siteHost);

    const day = utcDay();
    const salt =
      process.env.ANALYTICS_SALT?.trim() ||
      process.env.CRON_SECRET?.trim() ||
      // Last resort. The hash is still per-day, just guessable by somebody who
      // already has the table and the visitor's IP.
      "digiconnect-visits";

    const { error } = await supabase.from("site_visits").insert({
      visit_day: day,
      visitor_hash: dailyVisitorHash({ ip, userAgent, day, salt }),
      session_id: String(body?.sessionId ?? "").slice(0, 64) || "unknown",
      path,
      page_title: String(body?.title ?? "").slice(0, 200) || null,
      referrer_host: external ? referrerHost(referrer) : null,
      source: external ? classifySource(referrer, body?.utmSource) : classifySource(null, body?.utmSource),
      campaign: String(body?.campaign ?? "").slice(0, 120) || null,
      device: deviceFromUserAgent(userAgent),
      /*
        Geo from the CDN, not from the browser.

        Vercel resolves these at the edge; a visitor cannot set them, and we
        never see the IP they were derived from. Locally they are simply
        absent, which is why every one of them is nullable.
      */
      city: header(request, "x-vercel-ip-city"),
      region: header(request, "x-vercel-ip-country-region"),
      country: header(request, "x-vercel-ip-country"),
      is_entry: Boolean(body?.isEntry),
    });

    if (error) console.error("[track] insert_failed", error.message);
  } catch (error) {
    console.error("[track] failed", error instanceof Error ? error.message : error);
  }

  return noContent;
}

/** A header value, URL-decoded and trimmed to something a column can hold. */
function header(request: Request, name: string): string | null {
  const raw = request.headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim().slice(0, 80) || null;
  } catch {
    return raw.trim().slice(0, 80) || null;
  }
}
