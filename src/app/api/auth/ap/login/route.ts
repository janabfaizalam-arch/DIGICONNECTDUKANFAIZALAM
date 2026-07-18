import { NextResponse } from "next/server";
import { z } from "zod";

import { agencyInternalEmail } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { signInWithPasswordCookies } from "@/lib/auth/session-cookies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
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
        redirectTo: mustChange ? "/ap/change-password" : "/ap/dashboard",
        mustChangePassword: mustChange,
      });
    }

    if (partner.status !== "active" && partner.status !== "approved") {
      return NextResponse.json({ error: "Agency Partner account active/approved nahi hai." }, { status: 403 });
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
      redirectTo: mustChange ? "/ap/change-password" : "/ap/dashboard",
      mustChangePassword: mustChange,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
