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
 * The answer is the same whether or not the address belongs to a partner,
 * so the form cannot be used to find out who is one.
 */

const SENT =
  "Agar ye email kisi DC Partner ka registered email hai to us par password reset ka link bhej diya gaya hai. Inbox aur Spam dono dekhiye.";

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
  if (!isValidLoginEmail(email)) return json({ ok: false, error: "Sahi email address daaliye." }, 400);

  if (!smtpConfigured()) {
    return json({ ok: false, error: "Email se reset abhi chalu nahi hai. WhatsApp wala option use kijiye." }, 503);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return json({ ok: false, error: "Service unavailable." }, 503);

  const perAddress = checkRateLimit(`ap-forgot-email-to:${email}`, 3, 60 * 60_000);
  if (!perAddress.ok) return json({ ok: true, message: SENT });

  const authEmail =
    (await resolvePartnerContactEmailToAuthEmail(admin as unknown as PartnerLookupClient, email)) ?? email;

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: authEmail });
  const tokenHash = String(data?.properties?.hashed_token ?? "");
  if (error || !tokenHash || !data?.user) {
    // Not an account: same answer as success.
    return json({ ok: true, message: SENT });
  }

  // Only partners reset here; anybody else gets the same silent answer.
  const access = await getAgentAccessStatus(data.user);
  if (!access.ok) {
    console.warn("[ap-forgot-email] not_a_partner_or_refused", { reason: access.reason });
    return json({ ok: true, message: SENT });
  }

  const link = `${siteUrl(request)}/ap/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  const sent = await sendMail({
    to: email,
    subject: "DC Partner password reset",
    text: `Namaste,\n\nApna DC Partner password badalne ke liye ye link kholiye (1 ghante tak chalega):\n${link}\n\nAgar aapne ye nahi maanga tha to is email ko ignore kar dijiye.\n\nDigiConnect Dukan`,
    html: `<p>Namaste,</p><p>Apna DC Partner password badalne ke liye neeche ka button dabaiye. Ye link 1 ghante tak chalega.</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Naya password banaiye</a></p><p style="color:#64748b;font-size:13px">Agar aapne ye nahi maanga tha to is email ko ignore kar dijiye.</p><p>DigiConnect Dukan</p>`,
  });
  if (!sent) return json({ ok: false, error: "Email bhej nahi paaye. Thodi der baad try kijiye, ya WhatsApp wala option use kijiye." }, 502);

  return json({ ok: true, message: SENT });
}
