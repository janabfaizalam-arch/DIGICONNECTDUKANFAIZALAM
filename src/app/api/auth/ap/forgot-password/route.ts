import { NextResponse } from "next/server";

import { getAgentAccessStatus } from "@/lib/auth";
import { resolvePartnerContactEmailToAuthEmail, isValidLoginEmail, type PartnerLookupClient } from "@/lib/auth/partner-login-identifier";
import { sendMail, smtpConfigured } from "@/lib/email/smtp";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email a DC Partner a password reset link.
 *
 * A partner's Auth user sits at an internal address, so Supabase's own
 * reset email (sent to the Auth address) reaches nobody. This resolves the
 * address the partner typed — their real email, kept on profiles /
 * agency_partners — to the Auth user, mints a recovery token for it and
 * mails the link to the address they typed, which is where they read mail.
 *
 * An address with no DC Partner behind it is told so (the business asked
 * for that over a silent answer); per-IP and per-address limits keep the
 * form from being walked.
 */

const NOT_REGISTERED = "No DC Partner account is registered with this email.";

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

function siteUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`ap-forgot-email:${getClientIp(request)}`, 5, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!isValidLoginEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);

  if (!smtpConfigured()) {
    return json({ ok: false, error: "Email reset is not available right now. Please use WhatsApp." }, 503);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return json({ ok: false, error: "Service unavailable." }, 503);

  const perAddress = checkRateLimit(`ap-forgot-email-to:${email}`, 3, 60 * 60_000);
  if (!perAddress.ok) return json({ ok: false, error: "Too many attempts. Please try again later." }, 429);

  const authEmail =
    (await resolvePartnerContactEmailToAuthEmail(admin as unknown as PartnerLookupClient, email)) ?? email;

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: authEmail });
  const tokenHash = String(data?.properties?.hashed_token ?? "");
  if (error || !tokenHash || !data?.user) {
    return json({ ok: false, error: NOT_REGISTERED }, 404);
  }

  // Only partners reset here.
  const access = await getAgentAccessStatus(data.user);
  if (!access.ok) {
    console.warn("[ap-forgot-email] not_a_partner_or_refused", { reason: access.reason });
    return json({ ok: false, error: NOT_REGISTERED }, 404);
  }

  const link = `${siteUrl(request)}/ap/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  const sent = await sendMail({
    to: email,
    subject: "Reset your DC Partner password",
    text: `Open this link to set a new DC Partner password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this email.\n\nDigiConnect Dukan`,
    html: `<p>Click the button to set a new DC Partner password. The link is valid for 1 hour.</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Set new password</a></p><p style="color:#64748b;font-size:13px">If you did not ask for this, ignore this email.</p><p>DigiConnect Dukan</p>`,
  });
  if (!sent) return json({ ok: false, error: "Could not send the email. Please try again." }, 502);

  return json({ ok: true, message: `Reset link sent to ${email}. Check Inbox and Spam.` });
}
