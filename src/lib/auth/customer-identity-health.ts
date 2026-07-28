import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  findExistingCustomerByMobile,
  mobileLookupVariants,
  normalizeStoredMobile,
} from "@/lib/auth/customer-lookup";

export type CustomerIdentityHealth = {
  customerId: string | null;
  authUserLinked: boolean;
  profileLinked: boolean;
  role: string | null;
  normalizedMobile: string | null;
  pinConfigured: boolean;
  duplicateIdentityWarning: boolean;
  walletLinked: boolean;
  applicationsCount: number;
  status: "healthy" | "repairable" | "blocked" | "missing";
  notes: string[];
};

/**
 * Safe admin diagnostics for customer identity / PIN readiness.
 * Never returns PIN hash, OTP, or tokens.
 */
export async function getCustomerIdentityHealth(input: {
  customerId?: string | null;
  mobile?: string | null;
}): Promise<CustomerIdentityHealth> {
  const empty: CustomerIdentityHealth = {
    customerId: null,
    authUserLinked: false,
    profileLinked: false,
    role: null,
    normalizedMobile: null,
    pinConfigured: false,
    duplicateIdentityWarning: false,
    walletLinked: false,
    applicationsCount: 0,
    status: "missing",
    notes: ["No customer identity provided."],
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ...empty, notes: ["Service unavailable."] };
  }

  const notes: string[] = [];
  let customerId = input.customerId ?? null;
  let normalizedMobile = normalizeStoredMobile(input.mobile);

  let customer: {
    id: string;
    mobile: string | null;
    name: string | null;
    hashed_pin: string | null;
    is_active: boolean | null;
  } | null = null;

  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("id, mobile, name, hashed_pin, is_active")
      .eq("id", customerId)
      .maybeSingle();
    customer = data;
    if (customer && !normalizedMobile) {
      normalizedMobile = normalizeStoredMobile(customer.mobile);
    }
  } else if (normalizedMobile) {
    const variants = mobileLookupVariants(normalizedMobile);
    const { data } = await supabase
      .from("customers")
      .select("id, mobile, name, hashed_pin, is_active")
      .in("mobile", variants)
      .limit(5);
    if ((data?.length ?? 0) > 1) {
      return {
        ...empty,
        normalizedMobile,
        duplicateIdentityWarning: true,
        status: "blocked",
        notes: ["Multiple customers rows share this mobile."],
      };
    }
    customer = data?.[0] ?? null;
    customerId = customer?.id ?? null;
  }

  let profile: { id: string; role: string | null; phone: string | null; mobile: string | null } | null =
    null;
  if (normalizedMobile) {
    const variants = mobileLookupVariants(normalizedMobile);
    const [{ data: byPhone }, { data: byMobile }] = await Promise.all([
      supabase.from("profiles").select("id, role, phone, mobile").in("phone", variants).limit(5),
      supabase.from("profiles").select("id, role, phone, mobile").in("mobile", variants).limit(5),
    ]);
    const map = new Map<string, { id: string; role: string | null; phone: string | null; mobile: string | null }>();
    for (const row of [...(byPhone ?? []), ...(byMobile ?? [])]) map.set(row.id, row);
    const profiles = Array.from(map.values());
    if (profiles.length > 1) {
      notes.push("Multiple profiles share this mobile.");
    }
    profile = profiles[0] ?? null;
  }

  if (!customer && profile) {
    notes.push("Profile exists without customers row (Forgot PIN will auto-repair).");
  }

  let applicationsCount = 0;
  if (customerId || profile?.id || normalizedMobile) {
    const filters: string[] = [];
    if (customerId) filters.push(`customer_id.eq.${customerId}`);
    if (profile?.id) filters.push(`user_id.eq.${profile.id}`);
    if (normalizedMobile) {
      for (const v of mobileLookupVariants(normalizedMobile)) {
        filters.push(`customer_mobile.eq.${v}`);
      }
    }
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .or(filters.join(","));
    applicationsCount = count ?? 0;
  }

  let walletLinked = false;
  const walletUserId = profile?.id ?? customerId;
  if (walletUserId) {
    const { data: wallet } = await supabase
      .from("reward_wallets")
      .select("user_id")
      .eq("user_id", walletUserId)
      .maybeSingle();
    walletLinked = Boolean(wallet?.user_id);
  }

  const pinConfigured = Boolean(customer?.hashed_pin);
  const authUserLinked = Boolean(profile?.id);
  const profileLinked = Boolean(profile?.id);

  let status: CustomerIdentityHealth["status"] = "missing";
  if (customer && profileLinked && pinConfigured) status = "healthy";
  else if (customer && profileLinked) status = "repairable";
  else if (profileLinked && !customer) status = "repairable";
  else if (customer && !profileLinked) status = "repairable";
  else status = "missing";

  if (customer && customer.is_active === false) {
    status = "blocked";
    notes.push("Customer marked inactive.");
  }

  return {
    customerId: customer?.id ?? customerId,
    authUserLinked,
    profileLinked,
    role: profile?.role ?? null,
    normalizedMobile,
    pinConfigured,
    duplicateIdentityWarning: notes.some((n) => n.toLowerCase().includes("multiple")),
    walletLinked,
    applicationsCount,
    status,
    notes,
  };
}

/** Admin-only deterministic repair using the same Forgot PIN path. */
export async function adminRepairCustomerPinIdentity(mobile: string) {
  const local = normalizeStoredMobile(mobile);
  if (!local) {
    return { ok: false as const, error: "Valid Indian mobile required." };
  }
  const result = await findExistingCustomerByMobile(local);
  if (!result.ok) {
    return { ok: false as const, error: result.message, reason: result.reason };
  }
  return {
    ok: true as const,
    customerId: result.customerId,
    repaired: Boolean(result.repaired),
    lookupSource: result.lookupSource,
  };
}
