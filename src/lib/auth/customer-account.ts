import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side account helpers for the email/password customer system.
 *
 * The mobile number is stored on both the auth user's metadata and the
 * customers row. The customers row is the one queried for sign-in-by-mobile,
 * because the auth admin API has no "find user by metadata field" lookup.
 */

export type CustomerProfileInput = {
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
};

/** True when some other account already claims this mobile number. */
export async function mobileTaken(mobile: string, exceptUserId?: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("mobile", mobile)
    .limit(2);

  if (error) {
    console.error("[customer-account] mobile_check_failed", { error: error.message });
    // Fail closed: better to ask for a different number than to create a
    // duplicate that breaks sign-in-by-mobile for both people.
    return true;
  }

  return (data ?? []).some((row) => String(row.id) !== exceptUserId);
}

/** Resolve the login email for a mobile number, so one field can accept both. */
export async function emailForMobile(mobile: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("email")
    .eq("mobile", mobile)
    .not("email", "is", null)
    .neq("email", "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[customer-account] email_lookup_failed", { error: error.message });
    return null;
  }

  const email = String(data?.email ?? "").trim();
  return email || null;
}

/**
 * Create or update the customers row for an auth user.
 *
 * Keyed on `customers.id === auth user id`, which is the linkage the rest of
 * the app resolves against (documents, applications, invoices).
 */
export async function upsertCustomerProfile(
  input: CustomerProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable" };

  const row = {
    id: input.userId,
    user_id: input.userId,
    full_name: input.fullName,
    email: input.email,
    mobile: input.mobile,
    address: input.address,
    city: input.city,
    source: "online" as const,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("customers").upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[customer-account] profile_upsert_failed", {
      code: error.code,
      error: error.message,
    });
    return { ok: false, error: "Could not save your profile." };
  }

  return { ok: true };
}

/**
 * Fill in the profile for an account created through Google/Facebook.
 *
 * Social sign-up gives us a name and email but never a mobile or address, so
 * the row is created thin and the customer completes it afterwards. Existing
 * values are never overwritten with blanks.
 */
export async function ensureSocialCustomerProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: existing, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[customer-account] social_profile_check_failed", { error: error.message });
    return;
  }
  if (existing?.id) return;

  const meta = user.user_metadata ?? {};
  const fullName =
    String(meta.full_name ?? meta.name ?? "").trim() ||
    String(user.email ?? "").split("@")[0] ||
    "Customer";

  const { error: insertError } = await supabase.from("customers").insert({
    id: user.id,
    user_id: user.id,
    full_name: fullName,
    email: String(user.email ?? "").trim().toLowerCase(),
    mobile: "",
    address: "",
    city: "",
    source: "online",
  });

  if (insertError) {
    console.error("[customer-account] social_profile_insert_failed", {
      code: insertError.code,
      error: insertError.message,
    });
  }
}

/** True when the signed-in customer still needs to supply mobile/address. */
export async function profileNeedsCompletion(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from("customers")
    .select("mobile, address")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return true;
  return !String(data.mobile ?? "").trim() || !String(data.address ?? "").trim();
}
