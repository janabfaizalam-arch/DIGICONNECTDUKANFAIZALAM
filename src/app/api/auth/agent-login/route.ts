import { NextResponse } from "next/server";

import { getAgentAccessStatus } from "@/lib/auth";
import { PORTAL_CONTEXT_COOKIE, partnerAccessPublicMessage } from "@/lib/auth/memberships";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type AgentLoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
};

const invalidCredentialsMessage = "Invalid username/email or password.";

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ message, ...extra }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Resolve login email for Digi Partner identifiers.
 * Prefer auth.users.email over profiles.email so a corrupted profile email
 * (e.g. admin promotion overwrite) cannot sign into the wrong Auth user.
 */
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
    .select("id, email, role")
    .eq("agent_code", code)
    .in("role", ["agent", "agency_partner"])
    .maybeSingle();

  if (profileError) {
    console.error("[agent-login] Agent username lookup failed.", {
      identifier,
      error: profileError.message,
    });
  } else if (profileByCode?.id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profileByCode.id);
    const authEmail = String(authUser.user?.email ?? "").trim().toLowerCase();
    if (isValidEmail(authEmail)) return authEmail;
    const email = String(profileByCode.email ?? "").trim().toLowerCase();
    if (isValidEmail(email)) return email;
  }

  // Agency partner codes (and optional username column when present)
  const { data: byPartnerCode } = await supabaseAdmin
    .from("agency_partners")
    .select("user_id")
    .eq("partner_code", code)
    .maybeSingle();

  let partnerUserId = byPartnerCode?.user_id as string | undefined;

  if (!partnerUserId) {
    const { data: byUsername, error: usernameError } = await supabaseAdmin
      .from("agency_partners")
      .select("user_id")
      .eq("username", code.toLowerCase())
      .maybeSingle();
    if (!usernameError) {
      partnerUserId = byUsername?.user_id as string | undefined;
    }
  }

  if (partnerUserId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(partnerUserId);
    const authEmail = String(authUser.user?.email ?? "").trim().toLowerCase();
    if (isValidEmail(authEmail)) return authEmail;

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

function setPortalCookie(response: NextResponse) {
  response.cookies.set(PORTAL_CONTEXT_COOKIE, "ap", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
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
      return jsonError(invalidCredentialsMessage, 401, { code: "invalid_credentials" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.warn("[agent-login] Invalid credentials.", {
        identifierType: isValidEmail(identifier) ? "email" : "username",
        errorCode: error?.code ?? null,
      });
      return jsonError(invalidCredentialsMessage, 401, { code: "invalid_credentials" });
    }

    const access = await getAgentAccessStatus(data.user);

    if (!access.ok) {
      console.warn("[agent-login] Agent access denied after authentication.", {
        userId: data.user.id,
        reason: access.reason,
        role: access.role ?? null,
      });
      await supabase.auth.signOut();
      const message = partnerAccessPublicMessage(access.reason);
      return jsonError(message, 403, { code: access.reason });
    }

    const response = NextResponse.json({
      message: "Digi Partner login successful.",
      destination: "/ap/dashboard",
      redirectTo: "/ap/dashboard",
    });
    return setPortalCookie(response);
  } catch (error) {
    console.error("[agent-login] Login failed.", error);
    return jsonError("Digi Partner login failed. Please try again.", 500);
  }
}
