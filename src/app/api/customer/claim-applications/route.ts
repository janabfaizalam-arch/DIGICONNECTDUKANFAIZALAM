import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, syncUserProfile } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`claim:${getClientIp(request)}`, 10, 60_000);

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || role !== "customer") {
    return NextResponse.json({ message: "Customer login required." }, { status: 401 });
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({ message: "Verify your email before claiming applications." }, { status: 403 });
  }

  await syncUserProfile(user);

  const verifiedMobile = String(user.phone ?? user.user_metadata.mobile ?? user.user_metadata.phone ?? "").trim();
  if (!verifiedMobile) {
    console.info("CLAIM_SKIPPED_MISSING_MOBILE", {
      userId: user.id,
      email: user.email ?? null,
    });
    return NextResponse.json({ claimed: 0, skipped: "missing_mobile" });
  }

  const supabase = await getSupabaseRouteHandlerClient();

  if (!supabase) {
    return NextResponse.json({ message: "Claiming is not configured." }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("claim_customer_applications");

  if (error) {
    console.error("[customer-claim] Claim failed", error.message);
    return NextResponse.json({ message: "Applications could not be claimed." }, { status: 400 });
  }

  return NextResponse.json({ claimed: Number(data ?? 0) });
}
