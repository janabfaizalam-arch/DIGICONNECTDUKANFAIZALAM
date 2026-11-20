import { NextResponse } from "next/server";
import { z } from "zod";

import { agencyInternalEmail } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { isAuthLockedOut, logAuthSecurityEvent } from "@/lib/auth/security-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(128),
});

/*
  A partner who still has the password we gave them is sent to the panel, not
  to the password screen.

  This used to redirect straight to /ap/change-password, which is a wall: a
  partner standing at a counter with a customer in front of them could not get
  to the work until they had invented a password. The panel asks instead, on
  every sign-in, and keeps asking until they set one -- see
  components/ap/password-setup-prompt.tsx. `mustChangePassword` is still
  reported so a caller can act on it.
*/
export async function POST(request: Request) {
  const ipRate = checkRateLimit(`ap-login:${getClientIp(request) ?? "unknown"}`, 10, 60_000);
  if (!ipRate.ok) return rateLimitResponse(ipRate.retryAfter);

  try {
    const body = schema.parse(await request.json());
    const username = body.username.trim().toLowerCase();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const { data: partner } = await supabase
      .from("agency_partners")
      .select("id, user_id, status, username, must_change_password")
      .eq("username", username)
      .maybeSingle();

    if (!partner?.user_id) {
      // fallback: profiles.username
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, account_status, username")
        .eq("username", username)
        .maybeSingle();

      if (!profile || !["agency_partner", "agent"].includes(String(profile.role))) {
        return NextResponse.json({ error: "Username ya password galat hai." }, { status: 401 });
      }
      if (profile.account_status === "blocked" || profile.account_status === "suspended") {
        return NextResponse.json({ error: "Account inactive hai." }, { status: 403 });
      }

      const email = agencyInternalEmail(username);
      const session = await signInWithPasswordCookies(email, body.password);
      if (session.error) {
        return NextResponse.json({ error: "Username ya password galat hai." }, { status: 401 });
      }

      const { data: profileFlags } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", profile.id)
        .maybeSingle();
      const mustChange = Boolean(profileFlags?.must_change_password);

      return NextResponse.json({
        ok: true,
        redirectTo: "/dc-partner/dashboard",
        mustChangePassword: mustChange,
      });
    }

    if (partner.status !== "active" && partner.status !== "approved") {
      return NextResponse.json({ error: "DC Partner account active/approved nahi hai." }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, account_status, must_change_password")
      .eq("id", partner.user_id)
      .maybeSingle();

    if (!profile || !["agency_partner", "agent"].includes(String(profile.role))) {
      return NextResponse.json({ error: "Username ya password galat hai." }, { status: 401 });
    }
    if (profile.account_status === "blocked" || profile.account_status === "suspended") {
      return NextResponse.json({ error: "Account suspended hai." }, { status: 403 });
    }

    // Ten wrong passwords in 15 minutes lock this partner's sign-in for the
    // rest of the window, whichever IPs the attempts come from.
    if (
      await isAuthLockedOut({
        userId: partner.user_id as string,
        eventTypes: ["ap_login_failed"],
        maxFailures: 10,
        windowMs: 15 * 60_000,
      })
    ) {
      return NextResponse.json({ error: "Bahut zyada galat attempts. 15 minute baad try karein." }, { status: 429 });
    }

    const email = agencyInternalEmail(username);
    const session = await signInWithPasswordCookies(email, body.password);
    if (session.error) {
      await logAuthSecurityEvent({
        userId: partner.user_id as string,
        eventType: "ap_login_failed",
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
      });
      return NextResponse.json({ error: "Username ya password galat hai." }, { status: 401 });
    }

    await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", partner.user_id);

    const mustChange =
      Boolean(partner.must_change_password) || Boolean(profile.must_change_password);

    await logAuthSecurityEvent({
      userId: partner.user_id as string,
      eventType: "ap_login_success",
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/dc-partner/dashboard",
      mustChangePassword: mustChange,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
