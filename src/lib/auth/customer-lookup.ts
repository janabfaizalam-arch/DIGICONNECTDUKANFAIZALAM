import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerLookupResult =
  | {
      ok: true;
      customerId: string;
      mobile: string;
      name: string | null;
      isActive: boolean;
      profileId: string | null;
      lookupSource: "customers" | "customers+profiles";
    }
  | {
      ok: false;
      reason: "not_found" | "ambiguous" | "profile_only" | "service_unavailable";
      message: string;
      lookupSource?: "profiles" | "none";
    };

type CustomerRow = {
  id: string;
  mobile: string | null;
  name: string | null;
  is_active: boolean | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  phone: string | null;
  mobile: string | null;
  active: boolean | null;
  is_active: boolean | null;
};

const AMBIGUOUS_MESSAGE = "This mobile is linked to multiple accounts. Please contact support.";
const PROFILE_ONLY_MESSAGE =
  "Is number se customer record incomplete hai. Please support se contact karein.";

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

/** Pure resolver used by tests and findExistingCustomerByMobile. */
export function resolveCustomerMatches(input: {
  localPhone: string;
  customers: CustomerRow[];
  profiles: ProfileRow[];
}): CustomerLookupResult {
  const matchedCustomers = input.customers.filter((row) => matchesLocal(row.mobile, input.localPhone));

  if (matchedCustomers.length > 1) {
    return { ok: false, reason: "ambiguous", message: AMBIGUOUS_MESSAGE, lookupSource: "none" };
  }

  const matchedProfiles = input.profiles.filter((row) => {
    const role = String(row.role ?? "customer").toLowerCase();
    if (role && role !== "customer") return false;
    return matchesLocal(row.mobile, input.localPhone) || matchesLocal(row.phone, input.localPhone);
  });

  if (matchedProfiles.length > 1) {
    return { ok: false, reason: "ambiguous", message: AMBIGUOUS_MESSAGE, lookupSource: "profiles" };
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
      message: PROFILE_ONLY_MESSAGE,
      lookupSource: "profiles",
    };
  }

  return { ok: false, reason: "not_found", message: "Account not found", lookupSource: "none" };
}

/**
 * Resolve one existing CRM customer for Forgot / Create PIN and PIN login.
 * Primary source: public.customers.mobile (normalized).
 * Does not require Supabase Auth users or customers.user_id.
 */
export async function findExistingCustomerByMobile(localPhone: string): Promise<CustomerLookupResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, reason: "service_unavailable", message: "Service unavailable" };
  }

  const variants = mobileLookupVariants(localPhone);

  const [{ data: customers, error: customersError }, { data: byPhone }, { data: byMobile }] =
    await Promise.all([
      supabase.from("customers").select("id, mobile, name, is_active").in("mobile", variants),
      supabase.from("profiles").select("id, role, phone, mobile, active, is_active").in("phone", variants),
      supabase.from("profiles").select("id, role, phone, mobile, active, is_active").in("mobile", variants),
    ]);

  if (customersError) {
    console.error("[customer-lookup] customers_query_failed", {
      message: customersError.message,
      localPhoneMasked: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
    });
    return { ok: false, reason: "service_unavailable", message: "Service unavailable" };
  }

  const profileMap = new Map<string, ProfileRow>();
  for (const row of [...(byPhone ?? []), ...(byMobile ?? [])] as ProfileRow[]) {
    profileMap.set(row.id, row);
  }

  const result = resolveCustomerMatches({
    localPhone,
    customers: (customers ?? []) as CustomerRow[],
    profiles: Array.from(profileMap.values()),
  });

  console.info("[customer-lookup]", {
    "lookup source": result.ok ? result.lookupSource : result.lookupSource ?? result.reason,
    "customer id": result.ok ? result.customerId : null,
    reason: result.ok ? "ok" : result.reason,
    phone: `${localPhone.slice(0, 2)}******${localPhone.slice(-2)}`,
  });

  return result;
}

/** Signup guard: true when mobile already belongs to an existing customer record. */
export async function customerMobileAlreadyRegistered(localPhone: string): Promise<boolean> {
  const result = await findExistingCustomerByMobile(localPhone);
  return result.ok || result.reason === "ambiguous" || result.reason === "profile_only";
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
