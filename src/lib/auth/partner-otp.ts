import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Signing a DC Partner in with a WhatsApp OTP.
 *
 * Partners already have a password — their mobile number behind a fixed
 * prefix — but a password read down a phone line is the thing they forget, and
 * the number is the thing they never do. So the number itself becomes the way
 * in: enter it, read the six digits off WhatsApp, and you are in the panel.
 *
 * The OTP half is not built here. `auth_otp_requests` already holds a hashed
 * code with an expiry, an attempt ceiling, per-phone and per-IP hourly limits
 * and a one-time verification token, and it has been carrying customer OTPs in
 * production for months. This module is only the two things that are specific
 * to partners: finding which partner a number belongs to, and turning a
 * verified number into a real Supabase session without a password.
 */

export const PARTNER_LOGIN_OTP_PURPOSE = "partner_login" as const;

/** The partner a number belongs to, as far as signing in is concerned. */
export type PartnerForLogin = {
  id: string;
  userId: string;
  fullName: string | null;
  /** The address the auth user actually sits at — often an internal one. */
  authEmail: string;
};

/**
 * Find the partner who owns this mobile number.
 *
 * Returns null for a number with no partner, and for a partner record with no
 * login attached: both mean there is nobody to sign in, and the caller must
 * answer them identically so the form cannot be used to discover which numbers
 * are registered.
 *
 * A number held by more than one partner record is refused rather than guessed
 * at. That is a real shape in this directory — the same person onboarded twice
 * — and picking one at random would sign somebody into the wrong panel. The
 * admin "Number wale login par laayein" action is what settles those, and it
 * clears the username from every record but the one that does the work, so the
 * tie is broken on `username` rather than on `mobile`.
 */
export async function findPartnerForLogin(mobileLocal: string): Promise<PartnerForLogin | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("agency_partners")
    .select("id, user_id, full_name, username, status")
    .eq("mobile", mobileLocal)
    .limit(5);

  if (error) {
    console.error("[partner-otp] lookup_failed", { error: error.message });
    return null;
  }

  const rows = (data ?? []).filter((row) => Boolean(row.user_id));
  if (rows.length === 0) return null;

  /*
    One record answers to the number as a login; prefer it. With no such
    record, a single candidate is unambiguous and anything more is not.
  */
  const owner =
    rows.find((row) => String(row.username ?? "") === mobileLocal) ??
    (rows.length === 1 ? rows[0] : null);

  if (!owner) {
    console.warn("[partner-otp] ambiguous_number", { candidates: rows.length });
    return null;
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(String(owner.user_id));
  const authEmail = String(authUser?.user?.email ?? "").trim().toLowerCase();
  if (!authEmail) {
    console.error("[partner-otp] auth_user_without_email", { partnerId: owner.id });
    return null;
  }

  return {
    id: String(owner.id),
    userId: String(owner.user_id),
    fullName: (owner.full_name as string | null) ?? null,
    authEmail,
  };
}

/**
 * A one-time token that signs this auth user in.
 *
 * There is no password to hand to `signInWithPassword` — the partner proved
 * who they are with the OTP, not with a secret we hold — so the session comes
 * from a magic-link token minted for the account and redeemed immediately on
 * the server. The link is never sent anywhere: only its token hash is used,
 * and it is used in the same request that created it.
 */
export async function mintSessionToken(
  authEmail: string,
): Promise<{ ok: true; tokenHash: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable." };

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
  });

  const tokenHash = String(data?.properties?.hashed_token ?? "");

  if (error || !tokenHash) {
    console.error("[partner-otp] generate_link_failed", { message: error?.message });
    return { ok: false, error: "Login could not be completed. Please try again." };
  }

  return { ok: true, tokenHash };
}
