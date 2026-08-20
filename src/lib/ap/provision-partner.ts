/**
 * Turn an approved signup into a working Digi Partner account.
 *
 * Provisioning touches four places that must agree — the Supabase auth user,
 * `agency_partners`, `profiles` and `users` — and a partner whose rows disagree
 * either cannot log in or logs in with no partner record behind them. So the
 * auth user is deleted again if any of the three table writes fail, leaving no
 * half-made account for someone to trip over later.
 */

import { getNextPartnerCode } from "@/lib/ap-data";
import { normalizePartnerType } from "@/lib/ap/partner-type";
import type { DigiPartnerType } from "@/lib/ap/partner-type";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProvisionPartnerInput = {
  fullName: string;
  email: string;
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
  /**
   * Self-signups start unverified: they can work, but `/api/ap/wallet` refuses
   * a payout until KYC is approved, so money cannot leave on an unchecked
   * identity. Admin-created partners pass "approved" because a human already
   * saw the documents.
   */
  kycStatus?: "pending" | "approved";
};

export type ProvisionPartnerResult =
  | { ok: true; partnerId: string; userId: string; partnerCode: string }
  | { ok: false; error: string; status: number };

export async function provisionPartnerAccount(
  input: ProvisionPartnerInput,
): Promise<ProvisionPartnerResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Partner provisioning is unavailable.", status: 503 };

  const email = input.email.trim().toLowerCase();
  // The column is NOT NULL; an unrecognised legacy value must not become null
  // and fail the insert after the auth user already exists.
  const partnerType = normalizePartnerType(String(input.partnerType)) ?? "business_partner";

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return { ok: false, error: "An account with this email already exists.", status: 409 };
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

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "agency_partner" },
  });

  if (createError || !created?.user) {
    console.error("[provision-partner] auth_create_failed", { error: createError?.message });
    return { ok: false, error: "Partner credentials could not be registered.", status: 500 };
  }

  const userId = created.user.id;

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
    // in and land nowhere.
    await supabase.auth.admin.deleteUser(userId);
    return { ok: false, error: "Partner account could not be created.", status: 500 };
  }

  return { ok: true, partnerId: String(partnerRow.id), userId, partnerCode };
}
