import { customerInternalEmail } from "@/lib/auth/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerLookupResult =
  | {
      ok: true;
      profileId: string;
      customerId: string | null;
      accountStatus: string | null;
      role: string | null;
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous" | "no_auth_user" | "service_unavailable";
      message: string;
    };

type ProfileRow = {
  id: string;
  role: string | null;
  account_status: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
};

type CustomerRow = {
  id: string;
  user_id: string | null;
  mobile: string | null;
  email: string | null;
  full_name: string | null;
};

const AMBIGUOUS_MESSAGE = "This mobile is linked to multiple accounts. Please contact support.";
const INCOMPLETE_MESSAGE = "Is number se linked account incomplete hai. Please support se contact karein.";

/** Build common Indian mobile storage variants for equality lookups. */
export function mobileLookupVariants(local10: string): string[] {
  const local = local10.replace(/\D/g, "").slice(-10);
  return Array.from(
    new Set([local, `91${local}`, `+91${local}`, `0${local}`, `+91 ${local}`, `+91-${local}`]),
  );
}

function normalizeStoredMobile(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("91") && local.length === 12) local = local.slice(2);
  if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  return local.length === 10 ? local : null;
}

function matchesLocal(value: string | null | undefined, localPhone: string) {
  return normalizeStoredMobile(value) === localPhone;
}

/**
 * Resolve one existing customer auth profile for forgot-PIN / login recovery.
 * Never creates auth users. May ensure a profiles row exists for a linked user_id.
 */
export async function findExistingCustomerByMobile(localPhone: string): Promise<CustomerLookupResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: "service_unavailable", message: "Service unavailable" };
  }

  const variants = mobileLookupVariants(localPhone);
  const internalEmail = customerInternalEmail(localPhone);
  const profileIds = new Set<string>();
  const profilesById = new Map<string, ProfileRow>();

  const [{ data: byPhone }, { data: byMobile }, { data: byEmail }] = await Promise.all([
    supabase.from("profiles").select("id, role, account_status, phone, mobile, email").in("phone", variants),
    supabase.from("profiles").select("id, role, account_status, phone, mobile, email").in("mobile", variants),
    supabase
      .from("profiles")
      .select("id, role, account_status, phone, mobile, email")
      .eq("email", internalEmail)
      .maybeSingle(),
  ]);

  for (const row of [...(byPhone ?? []), ...(byMobile ?? []), ...(byEmail ? [byEmail] : [])] as ProfileRow[]) {
    const phoneMatch = matchesLocal(row.phone, localPhone) || matchesLocal(row.mobile, localPhone);
    const emailMatch = String(row.email ?? "").toLowerCase() === internalEmail;
    if (!phoneMatch && !emailMatch) continue;
    profileIds.add(row.id);
    profilesById.set(row.id, row);
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id, user_id, mobile, email, full_name")
    .in("mobile", variants);

  const matchedCustomers = ((customers ?? []) as CustomerRow[]).filter((row) =>
    matchesLocal(row.mobile, localPhone),
  );

  if (matchedCustomers.length > 1) {
    const linkedIds = new Set(
      matchedCustomers.map((row) => row.user_id).filter((id): id is string => Boolean(id)),
    );
    if (linkedIds.size > 1 || (linkedIds.size === 0 && matchedCustomers.length > 1)) {
      return { ok: false, reason: "ambiguous", message: AMBIGUOUS_MESSAGE };
    }
  }

  for (const customer of matchedCustomers) {
    if (!customer.user_id) continue;
    profileIds.add(customer.user_id);
    if (!profilesById.has(customer.user_id)) {
      const { data: linkedProfile } = await supabase
        .from("profiles")
        .select("id, role, account_status, phone, mobile, email")
        .eq("id", customer.user_id)
        .maybeSingle();
      if (linkedProfile) {
        profilesById.set(customer.user_id, linkedProfile as ProfileRow);
      }
    }
  }

  if (profileIds.size > 1) {
    return { ok: false, reason: "ambiguous", message: AMBIGUOUS_MESSAGE };
  }

  let profileId = profileIds.size === 1 ? Array.from(profileIds)[0] : null;
  const customerId = matchedCustomers[0]?.id ?? null;

  // Legacy: customers row exists but profile not found via phone fields
  if (!profileId && matchedCustomers.length === 1) {
    const customer = matchedCustomers[0];
    if (!customer.user_id) {
      return { ok: false, reason: "no_auth_user", message: INCOMPLETE_MESSAGE };
    }
    profileId = customer.user_id;
  }

  if (!profileId) {
    return { ok: false, reason: "not_found", message: "Account not found" };
  }

  // Ensure auth user exists — never create a new one
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profileId);
  if (authError || !authUser?.user) {
    return { ok: false, reason: "no_auth_user", message: INCOMPLETE_MESSAGE };
  }

  let profile = profilesById.get(profileId) ?? null;
  if (!profile) {
    const { data: fetched } = await supabase
      .from("profiles")
      .select("id, role, account_status, phone, mobile, email")
      .eq("id", profileId)
      .maybeSingle();
    profile = (fetched as ProfileRow | null) ?? null;
  }

  // Safely ensure profile row exists for the existing auth user (no new auth user)
  if (!profile) {
    const fullName =
      String(authUser.user.user_metadata?.full_name ?? matchedCustomers[0]?.full_name ?? "").trim() ||
      "Customer";
    const { error: insertError } = await supabase.from("profiles").insert({
      id: profileId,
      role: "customer",
      full_name: fullName,
      email: authUser.user.email ?? internalEmail,
      phone: localPhone,
      mobile: localPhone,
      account_status: "active",
      phone_verified: false,
    });
    if (insertError) {
      console.error("[customer-lookup] profile link insert failed", insertError.message);
      return { ok: false, reason: "no_auth_user", message: INCOMPLETE_MESSAGE };
    }
    profile = {
      id: profileId,
      role: "customer",
      account_status: "active",
      phone: localPhone,
      mobile: localPhone,
      email: authUser.user.email ?? internalEmail,
    };
  }

  const role = String(profile.role ?? "customer").toLowerCase();
  if (role && role !== "customer") {
    return { ok: false, reason: "not_found", message: "Account not found" };
  }

  if (customerId) {
    await supabase.from("customers").update({ user_id: profileId, mobile: localPhone }).eq("id", customerId);
  }

  return {
    ok: true,
    profileId,
    customerId,
    accountStatus: profile.account_status,
    role: profile.role,
  };
}

/** Signup guard: true when mobile already belongs to an existing customer record. */
export async function customerMobileAlreadyRegistered(localPhone: string): Promise<boolean> {
  const result = await findExistingCustomerByMobile(localPhone);
  return result.ok || result.reason === "ambiguous" || result.reason === "no_auth_user";
}
