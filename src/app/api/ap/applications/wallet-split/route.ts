import { NextResponse } from "next/server";

import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { payoutForAgentService } from "@/lib/agent-services";
import { previewSplit, reserveWalletForApplication } from "@/lib/payments/wallet-application-payment";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * What the wallet covers of a service's price, and holding it.
 *
 * `GET` only looks: the form uses it to show the partner what the wallet will
 * take before they commit to anything.
 *
 * `POST` holds the wallet's share and returns the reserve, so Razorpay can be
 * opened for the remainder. The hold happens before checkout rather than after
 * because the Razorpay amount depends on the balance: two applications started
 * in two tabs would otherwise both be told the wallet covers ₹25 and both spend
 * it. The partner's previous unclaimed hold is released first, so a form filled
 * and abandoned never leaves money they cannot see.
 *
 * The price comes from the service row every time. Nothing about the amount is
 * taken from the request body -- the browser is the one party with a reason to
 * understate what is owed.
 */

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message, error: message }, { status });
}

/** The platform's price for a service, and what it pays back. */
async function priceOf(serviceId: string, variantId: string | null) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: service } = await supabase
    .from("agent_services")
    .select("id, title, customer_fee, agent_payout, payout_type, payout_percentage, variants, is_active")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service || service.is_active === false) return null;

  const variants = Array.isArray(service.variants) ? service.variants : [];
  const variant = variantId
    ? (variants as Array<Record<string, unknown>>).find((v) => String(v.id) === variantId)
    : undefined;

  const price = variant ? Number(variant.price) : Number(service.customer_fee);
  const payout = variant
    ? Number(variant.score)
    : payoutForAgentService({
        customer_fee: Number(service.customer_fee) || 0,
        agent_payout: Number(service.agent_payout) || 0,
        payout_type: service.payout_type === "percentage" ? "percentage" : "fixed",
        payout_percentage: Number(service.payout_percentage) || 0,
      });

  return {
    title: String(service.title ?? "Service"),
    price: Number.isFinite(price) ? price : 0,
    payout: Number.isFinite(payout) ? payout : 0,
  };
}

async function resolvePartner(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isActiveAgent(user))) {
    return { error: jsonError("DC Partner access required.", 403) as NextResponse };
  }

  const partner = await getAgencyPartnerByUserId(user.id);
  if (!partner) return { error: jsonError("DC Partner record not found.", 404) as NextResponse };

  const limit = checkRateLimit(`ap-wallet-split:${partner.id || getClientIp(request)}`, 30, 60_000);
  if (!limit.ok) return { error: rateLimitResponse(limit.retryAfter) as NextResponse };

  return { partner };
}

export async function GET(request: Request) {
  const resolved = await resolvePartner(request);
  if (resolved.error) return resolved.error;

  const url = new URL(request.url);
  const serviceId = (url.searchParams.get("serviceId") ?? "").trim();
  const variantId = (url.searchParams.get("variantId") ?? "").trim() || null;
  if (!serviceId) return jsonError("Service chuniye.", 400);

  const service = await priceOf(serviceId, variantId);
  if (!service) return jsonError("Ye service abhi available nahi hai.", 404);

  const split = await previewSplit(resolved.partner.id, service.price);
  return NextResponse.json({ ok: true, service: service.title, payout: service.payout, ...split });
}

export async function POST(request: Request) {
  const resolved = await resolvePartner(request);
  if (resolved.error) return resolved.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Expected a JSON body.", 400);
  }

  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const serviceId = String(input.serviceId ?? "").trim();
  const variantId = String(input.variantId ?? "").trim() || null;
  if (!serviceId) return jsonError("Service chuniye.", 400);

  const service = await priceOf(serviceId, variantId);
  if (!service) return jsonError("Ye service abhi available nahi hai.", 404);

  const reserved = await reserveWalletForApplication({
    agencyPartnerId: resolved.partner.id,
    price: service.price,
    serviceName: service.title,
  });

  if (!reserved.ok) return jsonError(reserved.error, 409);

  return NextResponse.json({
    ok: true,
    reserveId: reserved.reserveId,
    ...reserved.split,
  });
}
