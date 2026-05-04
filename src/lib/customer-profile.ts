import type { User } from "@supabase/supabase-js";

import {
  getCustomerProfileCompletion,
  isCustomerProfileComplete,
  type CustomerProfile,
  type CustomerProfileFormValues,
} from "@/lib/customer-profile-shared";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const customerProfileColumns =
  "id, full_name, mobile, email, dob, gender, address, city, state, pincode, photo_url, profile_completed, created_at, updated_at";

export function getInitialCustomerProfile(user: User): CustomerProfileFormValues {
  return {
    full_name: String(user.user_metadata.full_name ?? user.user_metadata.name ?? "").trim(),
    mobile: user.phone ?? "",
    email: user.email ?? "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    photo_url: String(user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "").trim(),
  };
}

export async function getCustomerProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("customer_profiles")
      .select(customerProfileColumns)
      .eq("id", userId)
      .maybeSingle();

    return (data ?? null) as CustomerProfile | null;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("customer_profiles")
    .select(customerProfileColumns)
    .eq("id", userId)
    .maybeSingle();

  return (data ?? null) as CustomerProfile | null;
}

export async function getCustomerProfileStatus(userId: string) {
  const profile = await getCustomerProfile(userId);
  const complete = profile?.profile_completed === true || isCustomerProfileComplete(profile);

  return {
    profile,
    complete,
    completion: getCustomerProfileCompletion(profile),
  };
}
