/**
 * Turn an approved signup into a working DC Partner account.
 *
 * Provisioning touches four places that must agree — the Supabase auth user,
 * `agency_partners`, `profiles` and `users` — and a partner whose rows disagree
 * either cannot log in or logs in with no partner record behind them. So the
 * auth user is deleted again if any of the three table writes fail, leaving no
 * half-made account for someone to trip over later.
 */

import { getNextPartnerCode } from "@/lib/ap-data";
import { agencyInternalEmail } from "@/lib/auth/phone";
import { normalizePartnerType } from "@/lib/ap/partner-type";
import type { DigiPartnerType } from "@/lib/ap/partner-type";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProvisionPartnerInput = {
  fullName: string;
  /**
   * Contact address, and optional.
   *
   * It is not the credential: /api/auth/ap/login looks a partner up by
   * username and signs in as <username>@agency.rnos.internal. Plenty of shop
   * owners have a WhatsApp number and no working email.
   */
  email?: string | null;
  password: string;
  mobile: string;
  partnerType: DigiPartnerType | string;
  businessName?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  state?: string | null;
  district?: string | null;
  pin?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  gstin?: string | null;
  referralSource?: string | null;
  /** Omit to take the next free DCD-AP-#### code. */
  partnerCode?: string | null;
  /** Omit to derive the login username from the mobile number. */
  username?: string | null;
  /**
   * Self-signups start unverified: they can work, but `/api/ap/wallet` refuses
   * a payout until KYC is approved, so money cannot leave on an unchecked
   * identity. Admin-created partners pass "approved" because a human already
   * saw the documents.
   */
  kycStatus?: "pending" | "approved";
};

export type ProvisionPartnerResult =
  | { ok: true; partnerId: string; userId: string; partnerCode: string; username: string }
  | { ok: false; error: string; status: number };

/**
 * Whether Supabase refused because the login address is already taken.
 *
 * The code is the reliable signal; the messages are matched too because older
 * GoTrue versions only sent a sentence.
 */
export function isEmailTakenError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "email_exists" || error.code === "user_already_exists") return true;
  return /already (been )?regist|email.*(already|exists)|duplicate key/i.test(error.message ?? "");
}

/**
 * What an admin should be told when the auth user cannot be made.
 *
 * Every failure here used to collapse into "Partner credentials could not be
 * registered." -- true, unactionable, and identical whether the password was
 * rejected, the address was taken or Supabase was down. The real reason is in
 * the server log, which is not where somebody standing in front of the approve
 * button is looking. Known causes get a sentence that says what to do; an
 * unknown one carries Supabase's own words rather than hiding them, because a
 * message nobody can act on is worse than a slightly technical one.
 */
export function describeAuthCreateFailure(error: { code?: string; message?: string } | null): string {
  const message = (error?.message ?? "").trim();

  if (/password/i.test(message)) {
    return `Temporary password Supabase ne reject kar diya: ${message}`;
  }
  if (/rate|too many/i.test(message)) {
    return "Supabase ne abhi bahut requests bata kar rok diya. Ek minute baad dobara try kijiye.";
  }
  if (!message) {
    return "Partner credentials could not be registered (Supabase ne koi wajah nahi batayi).";
  }
  return `Partner credentials could not be registered: ${message}`;
}

/**
 * The auth user holding a login address, if there is one.
 *
 * `listUsers` has no email filter, so this pages -- which is why it is only
 * called after a create has already failed on a collision, never on the happy
 * path. The bound mirrors `findAuthUserByEmailOrMobile`.
 */
async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  email: string,
): Promise<{ id: string } | null> {
  const target = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("[provision-partner] auth_list_failed", { error: error.message });
      return null;
    }

    const match = data.users.find((user) => (user.email ?? "").trim().toLowerCase() === target);
    if (match) return { id: match.id };
    if (data.users.length < 1000) return null;
  }

  return null;
}

export async function provisionPartnerAccount(
  input: ProvisionPartnerInput,
): Promise<ProvisionPartnerResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Partner provisioning is unavailable.", status: 503 };

  const contactEmail = String(input.email ?? "").trim().toLowerCase();
  // The column is NOT NULL; an unrecognised legacy value must not become null
  // and fail the insert after the auth user already exists.
  const partnerType = normalizePartnerType(String(input.partnerType)) ?? "business_partner";

  /*
    The username is the account. This is what was missing.

    Approving a signup created an auth user at the applicant's own email
    address and set no username at all — while /api/auth/ap/login resolves a
    username to <username>@agency.rnos.internal and signs in with that. So
    every approved partner got a partner code, a temporary password, and no
    way whatsoever to log in; the admin screen did not even have a username to
    read out. Partners created by an admin at /admin/agency-partners/new have
    always worked, because that route does exactly what follows.

    The mobile number is the username: the partner already knows it, it is
    unique among partners, and it is what the team calls them on.
  */
  const username = await freeUsername(input.username?.trim().toLowerCase() || input.mobile);
  if (!username) {
    return { ok: false, error: "Could not allocate a partner username.", status: 409 };
  }

  // Supabase needs an address for the auth user; this is the one the login
  // route will construct from the username, not the applicant's own.
  const loginEmail = agencyInternalEmail(username);
  const email = contactEmail || loginEmail;

  if (contactEmail) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", contactEmail)
      .maybeSingle();

    if (existingProfile) {
      return { ok: false, error: "An account with this email already exists.", status: 409 };
    }
  }

  const partnerCode = (input.partnerCode?.trim() || (await getNextPartnerCode())).toUpperCase();

  const { data: codeTaken } = await supabase
    .from("agency_partners")
    .select("id")
    .ilike("partner_code", partnerCode)
    .maybeSingle();

  if (codeTaken) {
    return { ok: false, error: "Partner code is already in use.", status: 409 };
  }

  const { data: tier } = await supabase
    .from("agency_partner_tiers")
    .select("id")
    .eq("slug", "ap-starter")
    .maybeSingle();

  const authPayload = {
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, username, role: "agency_partner" },
    app_metadata: { role: "agency_partner" },
  };

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    ...authPayload,
  });

  let userId = created?.user?.id ?? "";
  /* Only an auth user this call brought into existence may be deleted on
     rollback. Deleting one that was already there would take a partner's login
     away because our own table write failed. */
  let createdAuthUser = Boolean(userId);

  if (!userId) {
    /*
      A login address already taken is the one failure worth recovering from,
      and it is the one that had the admin stuck.

      `freeUsername` only looks at `agency_partners` and `profiles`, so an auth
      user left behind by an earlier attempt -- provisioned, then rolled back
      with a delete that did not land -- is invisible to it. Every retry then
      failed on the same collision, with a message that named none of this, and
      the application could never be approved.

      So: find the holder. With no partner behind it, it is that leftover and
      is adopted -- same id, new password, right metadata -- which also gives
      the partner their mobile number as their username rather than a suffixed
      one. With a partner behind it, this mobile really is somebody already,
      and that is a different sentence entirely.
    */
    if (!isEmailTakenError(createError)) {
      console.error("[provision-partner] auth_create_failed", {
        code: createError?.code,
        error: createError?.message,
      });
      return { ok: false, error: describeAuthCreateFailure(createError), status: 500 };
    }

    const holder = await findAuthUserByEmail(supabase, loginEmail);

    if (!holder) {
      console.error("[provision-partner] auth_create_collision_unresolved", { username });
      return {
        ok: false,
        error: `Login ID "${username}" pehle se kisi aur ke paas hai, aur wo account mil nahi raha. Doosra username dijiye.`,
        status: 409,
      };
    }

    const { data: livePartner } = await supabase
      .from("agency_partners")
      .select("id, partner_code")
      .eq("user_id", holder.id)
      .maybeSingle();

    if (livePartner) {
      return {
        ok: false,
        error: `Is mobile number se ek partner pehle se bana hua hai (${String(livePartner.partner_code ?? "")}). Usi account ka password reset kijiye.`,
        status: 409,
      };
    }

    const { error: adoptError } = await supabase.auth.admin.updateUserById(holder.id, authPayload);

    if (adoptError) {
      console.error("[provision-partner] auth_adopt_failed", { error: adoptError.message });
      return { ok: false, error: describeAuthCreateFailure(adoptError), status: 500 };
    }

    console.warn("[provision-partner] adopted_orphan_auth_user", { username, userId: holder.id });
    userId = holder.id;
    createdAuthUser = false;
  }

  const shared = {
    full_name: input.fullName,
    email,
    mobile: input.mobile,
    aadhaar_number: input.aadhaarNumber || null,
    pan_number: input.panNumber || null,
    state: input.state || null,
  };

  const { data: partnerRow, error: partnerError } = await supabase
    .from("agency_partners")
    .upsert(
      {
        ...shared,
        user_id: userId,
        username,
        partner_code: partnerCode,
        business_name: input.businessName || null,
        partner_type: partnerType,
        whatsapp: input.whatsapp || null,
        address: input.address || null,
        district: input.district || null,
        pin: input.pin || null,
        gstin: input.gstin || null,
        referral_source: input.referralSource || null,
        tier_id: tier?.id ?? null,
        status: "active",
        kyc_status: input.kycStatus ?? "pending",
        // The temporary password is read out over the phone. It stops being a
        // password the moment the partner is in.
        must_change_password: true,
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .maybeSingle();

  const [profileRes, userRes] = await Promise.all([
    supabase.from("profiles").upsert(
      {
        ...shared,
        id: userId,
        role: "agency_partner",
        username,
        must_change_password: true,
        agent_code: partnerCode,
        address: input.address || null,
        area: input.address || null,
        shop_name: input.businessName || null,
        shop_address: input.address || null,
        pincode: input.pin || null,
        city: input.district || null,
        gst_number: input.gstin || null,
        kyc_status: input.kycStatus ?? "pending",
        active: true,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ),
    supabase.from("users").upsert(
      {
        id: userId,
        full_name: input.fullName,
        email,
        role: "agency_partner",
        avatar_url: "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    ),
  ]);

  if (partnerError || !partnerRow || profileRes.error || userRes.error) {
    console.error("[provision-partner] sync_failed", {
      partner: partnerError?.message,
      profile: profileRes.error?.message,
      user: userRes.error?.message,
    });
    // Leave nothing half-provisioned: an auth user with no partner row can log
    // in and land nowhere. Only the one this call made, though -- an adopted
    // user was already there, and deleting it would turn a failed write into a
    // deleted login.
    if (createdAuthUser) await supabase.auth.admin.deleteUser(userId);

    const reason = partnerError?.message || profileRes.error?.message || userRes.error?.message || "";
    return {
      ok: false,
      error: reason ? `Partner account could not be created: ${reason}` : "Partner account could not be created.",
      status: 500,
    };
  }

  return { ok: true, partnerId: String(partnerRow.id), userId, partnerCode, username };
}

/**
 * A username nobody else holds.
 *
 * The mobile number is the natural choice, and it is unique per partner — but
 * a partner who was once created by hand may already hold it, and a collision
 * here would fail the insert *after* the auth user exists. Two suffixed tries
 * are enough for a case that should not happen; beyond that, refusing is
 * better than provisioning something the login cannot find.
 */
async function freeUsername(seed: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const base = seed.replace(/[^a-z0-9._-]/g, "") || "partner";

  for (const candidate of [base, `${base}1`, `${base}2`]) {
    const [partner, profile] = await Promise.all([
      supabase.from("agency_partners").select("id").eq("username", candidate).maybeSingle(),
      supabase.from("profiles").select("id").eq("username", candidate).maybeSingle(),
    ]);
    if (!partner.data && !profile.data) return candidate;
  }

  return null;
}
