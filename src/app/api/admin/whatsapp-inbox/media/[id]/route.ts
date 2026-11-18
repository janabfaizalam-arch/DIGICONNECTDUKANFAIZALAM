import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { loadMetaConfig } from "@/lib/whatsapp/meta-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rate = checkRateLimit(`admin-inbox-media:${getClientIp(request)}`, 120, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: mediaId } = await params;
  if (!mediaId || !/^\d+$/.test(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  const loaded = loadMetaConfig();
  if (!loaded.ok) {
    return NextResponse.json({ error: "WhatsApp credentials not configured" }, { status: 503 });
  }

  const { config } = loaded;

  try {
    // 1. Fetch media URL from Meta Graph API
    const metaMetaRes = await fetch(`${config.apiBase}/${config.graphVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      cache: "no-store",
    });

    if (!metaMetaRes.ok) {
      return NextResponse.json({ error: "Media not found on WhatsApp" }, { status: 404 });
    }

    const metaInfo = (await metaMetaRes.json()) as { url?: string; mime_type?: string };
    if (!metaInfo.url) {
      return NextResponse.json({ error: "Media URL unavailable" }, { status: 404 });
    }

    // 2. Fetch the actual binary file from Meta lookaside URL
    const binaryRes = await fetch(metaInfo.url, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!binaryRes.ok) {
      return NextResponse.json({ error: "Could not fetch media content" }, { status: 502 });
    }

    const contentType = metaInfo.mime_type || binaryRes.headers.get("content-type") || "application/octet-stream";
    const buffer = await binaryRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[whatsapp-media-proxy] Fetch error", err);
    return NextResponse.json({ error: "Failed to retrieve media" }, { status: 500 });
  }
}
