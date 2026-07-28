import { hashPin } from "@/lib/auth-v2/password";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerLookupReason =
  | "not_found"
  | "ambiguous"
  | "profile_only"
  | "inactive"
  | "service_unavailable"
  | "repair_failed";

export type CustomerLookupResult =
  | {
      ok: true;
      customerId: string;
      mobile: string;
      name: string | null;
      isActive: boolean;
      profileId: string | null;
      lookupSource: "customers" | "customers+profiles" | "profile_repaired" | "application_repaired";
      repaired?: boolean;
    }
  | {
      ok: false;
      reason: CustomerLookupReason;
      message: string;
      lookupSource?: "profiles" | "none" | "applications";
      /** Server/admin diagnostic only — never shown raw to end users unless mapped. */
      internalCode?: string;
    };

type CustomerRow = {
  id: string;
  mobile: string | null;
  name: string | null;
  is_active: boolean | null;
  hashed_pin?: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  phone: string | null;
  mobile: string | null;
  full_name?: string | null;
  email?: string | null;
  active: boolean | null;
  is_active: boolean | null;
  account_status?: string | null;
};

const MESSAGES = {
  ambiguous: "This mobile is linked to more than one account. Please contact support.",
  notRegistered: "No customer account is registered with this mobile number.",
  incomplete:
    "Your customer login setup is incomplete. Our support team can repair it.",
  inactive: "Your account is inactive.",
  unavailable: "Service unavailable. Please try again.",
  repairFailed: "Your customer login setup is incomplete. Our support team can repair it.",
} as const;

/** Build common Indian mobile storage variants for equality lookups. */
export function mobileLookupVariants(local10: string): string[] {
  const local = local10.replace(/\D/g, "").slice(-10);
  return Array.from(
    new Set([local, `91${local}`, `+91${local}`, `0${local}`, `+91 ${local}`, `+91-${local}`]),
  );
}

export function normalizeStoredMobile(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("91") && local.length === 12) local = local.slice(2);
  if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  return local.length === 10 ? local : null;
}

export function matchesLocal(value: string | null | undefined, localPhone: string) {
  return normalizeStoredMobile(value) === localPhone;
}

function isCustomerRole(role: string | null | undefined) {
  const value = String(role ?? "customer").toLowerCase();
  return !value || value === "customer";
}

/** Pure resolver used by tests — does not create rows. */
export function resolveCustomerMatches(input: {
  localPhone: string;
  customers: CustomerRow[];
  profiles: ProfileRow[];
}): CustomerLookupResult {
  const matchedCustomers = input.customers.filter((row) => matchesLocal(row.mobile, input.localPhone));

  if (matchedCustomers.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      message: MESSAGES.ambiguous,
      lookupSource: "none",
      internalCode: "duplicate_customers_mobile",
    };
  }

  const matchedProfiles = input.profiles.filter((row) => {
    if (!isCustomerRole(row.role)) return false;
    return matchesLocal(row.mobile, input.localPhone) || matchesLocal(row.phone, input.localPhone);
  });

  if (matchedProfiles.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      message: MESSAGES.ambiguous,
      lookupSource: "profiles",
      internalCode: "duplicate_profiles_mobile",
    };
  }

  if (matchedCustomers.length === 1) {
    const customer = matchedCustomers[0];
    const profileId = matchedProfiles[0]?.id ?? null;
    return {
      ok: true,
      customerId: customer.id,
      mobile: input.localPhone,
      name: customer.name,
      isActive: customer.is_active !== false,
      profileId,
      lookupSource: profileId ? "customers+profiles" : "customers",
    };
  }

  if (matchedProfiles.length === 1) {
    return {
      ok: false,
      reason: "profile_only",
      message: MESSAGES.incomplete,
      lookupSource: "profiles",
      internalCode: "profile_without_customers_row",
    };
  }

  return {
    ok: false,
    reason: "not_found",
    message: MESSAGES.notRegistered,
    lookupSource: "none",
    internalCode: "no_customer_or_profile",
  };
}

async function loadCustomersByMobileVariants(localPhone: string): Promise<{
  rows: CustomerRow[];
  errorMessage?: string;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { rows: [], errorMessage: "no_admin" };

  const variants = mobileLookupVariants(localPhone);
  const { data, error } = await supabase
    .from("customers")
    .select("id, mobile, name, is_active, hashed_pin")
    .in("mobile", variants);

  if (error) {
    return { rows: [], errorMessage: error.message };
  }

  return { rows: (data ?? []) as CustomerRow[] };
}

async function loadProfilesByMobileVariants(localPhone: string): Promise<ProfileRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const variants = mobileLookupVariants(localPhone);
  const [{ data: byPhone }, { data: byMobile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, phone, mobile, full_name, email, active, is_active, account_status")
      .in("phone", variants),
    supabase
      .from("profiles")
      .select("id, role, phone, mobile, full_name, email, active, is_active, account_status")
      .in("mobile", variants),
  ]);

  const map = new Map<string, ProfileRow>();
  for (const row of [...(byPhone ?? []), ...(byMobile ?? [])] as ProfileRow[]) {
    map.set(row.id, row);
  }
  return Array.from(map.values());
}

/**
 * Create a PIN-auth customers row for an existing customer profile.
 * Prefer id = profile.id so PIN JWT `sub` aligns with applications.user_id / auth.users.id.
 */
export async function repairCustomerRecordFromProfile(input: {
  localPhone: string;
  profile: ProfileRow;
}): Promise<CustomerLookupResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: "service_unavailable", message: MESSAGES.unavailable };
  }

  const existing = await loadCustomersByMobileVariants(input.localPhone);
  if (existing.rows.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      message: MESSAGES.ambiguous,
      internalCode: "duplicate_after_repair_check",
    };
  }
  if (existing.rows.length === 1) {
    return {
      ok: true,
      customerId: existing.rows[0].id,
      mobile: input.localPhone,
      name: existing.rows[0].name,
      isActive: existing.rows[0].is_active !== false,
      profileId: input.profile.id,
      lookupSource: "customers+profiles",
    };
  }

  if (!isCustomerRole(input.profile.role)) {
    return {
      ok: false,
      reason: "not_found",
      message: MESSAGES.notRegistered,
      internalCode: "profile_wrong_role",
    };
  }

  const displayName =
    String(input.profile.full_name ?? "").trim() ||
    `Customer ${input.localPhone.slice(-4)}`;

  const { data: idTaken } = await supabase
    .from("customers")
    .select("id, mobile")
    .eq("id", input.profile.id)
    .maybeSingle();

  const customerId = idTaken?.id ? globalThis.crypto.randomUUID() : input.profile.id;

  if (idTaken?.id && normalizeStoredMobile(idTaken.mobile) && normalizeStoredMobile(idTaken.mobile) !== input.localPhone) {
    // Profile UUID already used by a different mobile customer — do not overwrite.
    return {
      ok: false,
      reason: "ambiguous",
      message: MESSAGES.ambiguous,
      internalCode: "profile_id_collision_other_mobile",
    };
  }

  const basePayload: Record<string, unknown> = {
    id: customerId,
    mobile: input.localPhone,
    name: displayName,
    is_active: true,
    email: String(input.profile.email ?? "").trim(),
  };

  let insertError = (
    await supabase.from("customers").insert(basePayload).select("id, mobile, name, is_active").maybeSingle()
  ).error;

  // Production historically required hashed_pin NOT NULL — use unusable placeholder until Create PIN.
  if (insertError && /hashed_pin/i.test(insertError.message)) {
    const placeholder = await hashPin(`unset-${customerId}-${Date.now()}`);
    const retry = await supabase
      .from("customers")
      .insert({ ...basePayload, hashed_pin: placeholder })
      .select("id, mobile, name, is_active")
      .maybeSingle();
    insertError = retry.error;
    if (!insertError && retry.data) {
      await relinkApplicationsForMobile({
        localPhone: input.localPhone,
        customerId: String(retry.data.id),
        profileId: input.profile.id,
      });
      return {
        ok: true,
        customerId: String(retry.data.id),
        mobile: input.localPhone,
        name: (retry.data.name as string | null) ?? displayName,
        isActive: retry.data.is_active !== false,
        profileId: input.profile.id,
        lookupSource: "profile_repaired",
        repaired: true,
      };
    }
  }

  if (insertError) {
    console.error("[customer-lookup] repair_insert_failed", {
      profileId: input.profile.id,
      message: insertError.message,
      code: insertError.code,
    });
    return {
      ok: false,
      reason: "repair_failed",
      message: MESSAGES.repairFailed,
      internalCode: insertError.code || "insert_failed",
    };
  }

  await relinkApplicationsForMobile({
    localPhone: input.localPhone,
    customerId,
    profileId: input.profile.id,
  });

  console.info("[customer-lookup] profile_repaired", {
    customerId,
    profileId: input.profile.id,
    phone: `${input.localPhone.slice(0, 2)}******${input.localPhone.slice(-2)}`,
  });

  return {
    ok: true,
    customerId,
    mobile: input.localPhone,
    name: displayName,
    isActive: true,
    profileId: input.profile.id,
    lookupSource: "profile_repaired",
    repaired: true,
  };
}

async function relinkApplicationsForMobile(input: {
  localPhone: string;
  customerId: string;
  profileId: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const variants = mobileLookupVariants(input.localPhone);
  try {
    await supabase
      .from("applications")
      .update({ customer_id: input.customerId })
      .eq("user_id", input.profileId)
      .in("customer_mobile", variants);
  } catch (error) {
    console.warn("[customer-lookup] application_relink_skipped", {
      customerId: input.customerId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Resolve one existing CRM/PIN customer for Forgot / Create PIN and PIN login.
 * Primary source: public.customers.mobile (normalized 10-digit).
 * If only profiles match, deterministically repair a customers row (no duplicate Auth user).
 */
export async function findExistingCustomerByMobile(localPhone: string): Promise<CustomerLookupResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: "service_unavailable", message: MESSAGES.unavailable };
  }

  const [{ rows: customers, errorMessage }, profiles] = await Promise.all([
    loadCustomersByMobileVariants(localPhone),
    loadProfilesByMobileVariants(localPhone),
  ]);

  if (errorMessage) {
    console.error("[customer-lookup] customers_query_failed", {
      message: errorMessage,
      localPhoneMasked: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
    });
    return { ok: false, reason: "service_unavailable", message: MESSAGES.unavailable };
  }

  const resolved = resolveCustomerMatches({ localPhone, customers, profiles });

  if (resolved.ok) {
    console.info("[customer-lookup]", {
      "lookup source": resolved.lookupSource,
      "customer id": resolved.customerId,
      reason: "ok",
      phone: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
    });
    return resolved;
  }

  if (resolved.reason === "profile_only") {
    const profile = profiles.find(
      (row) =>
        isCustomerRole(row.role) &&
        (matchesLocal(row.mobile, localPhone) || matchesLocal(row.phone, localPhone)),
    );
    if (!profile) {
      return resolved;
    }

    const repaired = await repairCustomerRecordFromProfile({ localPhone, profile });
    console.info("[customer-lookup]", {
      "lookup source": repaired.ok ? repaired.lookupSource : repaired.lookupSource ?? repaired.reason,
      "customer id": repaired.ok ? repaired.customerId : null,
      reason: repaired.ok ? "repaired" : repaired.reason,
      phone: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
      internalCode: repaired.ok ? undefined : repaired.internalCode,
    });
    return repaired;
  }

  console.info("[customer-lookup]", {
    "lookup source": resolved.lookupSource ?? resolved.reason,
    "customer id": null,
    reason: resolved.reason,
    phone: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
    internalCode: resolved.internalCode,
  });

  return resolved;
}

/** Signup guard: true when mobile already belongs to an existing customer/profile identity. */
export async function customerMobileAlreadyRegistered(localPhone: string): Promise<boolean> {
  const result = await findExistingCustomerByMobile(localPhone);
  return result.ok || result.reason === "ambiguous" || result.reason === "profile_only" || result.reason === "repair_failed";
}

/** Best-effort profile sync — only columns that exist in production. */
export async function syncProfileMobileFlags(input: {
  profileId: string | null;
  localPhone: string;
}): Promise<void> {
  if (!input.profileId) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      mobile: input.localPhone,
      phone: input.localPhone,
      active: true,
      is_active: true,
    })
    .eq("id", input.profileId);

  if (error) {
    console.warn("[customer-lookup] profile_sync_skipped", {
      profileId: input.profileId,
      message: error.message,
    });
  }
}

/** Revoke all PIN refresh sessions for a customer after PIN reset. */
export async function revokeAllCustomerPinSessions(customerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    await supabase.from("customer_sessions").update({ is_revoked: true }).eq("customer_id", customerId);
  } catch (error) {
    console.warn("[customer-lookup] session_revoke_skipped", {
      customerId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
