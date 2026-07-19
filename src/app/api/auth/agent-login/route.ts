import { NextResponse } from "next/server";

import { getAgentAccessStatus } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type AgentLoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
};

const invalidCredentialsMessage = "Invalid username/email or password.";
const accessDeniedMessage = "Access denied. Please contact admin.";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function resolveAgentEmail(identifier: string) {
  if (isValidEmail(identifier)) {
    return identifier.toLowerCase();
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    console.error("[agent-login] Missing Supabase service role configuration for username lookup.");
    return null;
  }

  const code = identifier.trim();

  // Legacy agent_code on profiles (agent or agency_partner)
  const { data: profileByCode, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email, role")
    .eq("agent_code", code)
    .in("role", ["agent", "agency_partner"])
    .maybeSingle();

  if (profileError) {
    console.error("[agent-login] Agent username lookup failed.", {
      identifier,
      error: profileError.message,
    });
  } else {
    const email = String(profileByCode?.email ?? "").trim().toLowerCase();
    if (isValidEmail(email)) return email;
  }

  // Agency partner codes / usernames
  const normalizedCode = code.toLowerCase();
  const { data: byPartnerCode } = await supabaseAdmin
    .from("agency_partners")
    .select("user_id")
    .eq("partner_code", code)
    .maybeSingle();
  const { data: byUsername } = byPartnerCode
    ? { data: null }
    : await supabaseAdmin.from("agency_partners").select("user_id").eq("username", normalizedCode).maybeSingle();

  const partnerUserId = byPartnerCode?.user_id ?? byUsername?.user_id;
  if (partnerUserId) {
    const { data: partnerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", partnerUserId)
      .maybeSingle();
    const email = String(partnerProfile?.email ?? "").trim().toLowerCase();
    if (isValidEmail(email)) return email;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(`agent-login:${getClientIp(request)}`, 8, 60_000);

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = (await request.json().catch(() => null)) as AgentLoginBody | null;
    const identifier = String(body?.identifier ?? body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!identifier || !password) {
      return jsonError("Username/email and password are required.", 400);
    }

    const supabase = await getSupabaseRouteHandlerClient();

    if (!supabase) {
      console.error("[agent-login] Supabase route client is not configured.");
      return jsonError("Login is not available right now.", 500);
    }

    const email = await resolveAgentEmail(identifier);

    if (!email) {
      return jsonError(invalidCredentialsMessage, 401);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.warn("[agent-login] Invalid credentials.", {
        identifierType: isValidEmail(identifier) ? "email" : "username",
        errorCode: error?.code ?? null,
      });
      return jsonError(invalidCredentialsMessage, 401);
    }

    const access = await getAgentAccessStatus(data.user);

    if (!access.ok) {
      console.warn("[agent-login] Agent access denied after authentication.", {
        userId: data.user.id,
        reason: access.reason,
        role: access.role ?? null,
      });
      await supabase.auth.signOut();
      return jsonError(accessDeniedMessage, 403);
    }

    return NextResponse.json({
      message: "Agent login successful.",
      destination: "/ap/dashboard",
    });
  } catch (error) {
    console.error("[agent-login] Login failed.", error);
    return jsonError("Agent login failed. Please try again.", 500);
  }
}
