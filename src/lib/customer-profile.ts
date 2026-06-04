import type { User } from "@supabase/supabase-js";

import {
  getCustomerProfileCompletion,
  isCustomerProfileComplete,
  type CustomerProfile,
  type CustomerProfileFormValues,
} from "@/lib/customer-profile-shared";
import { ensureReferralCodeForUser } from "@/lib/referrals";
import { createWalletIfMissing } from "@/lib/rewards-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const customerProfileColumns =
  "id, full_name, mobile, email, dob, gender, address, city, district, state, pincode, photo_url, profile_completed, created_at, updated_at";

export type CustomerDashboardProfile = {
  full_name?: string | null;
  mobile?: string | null;
  email?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
};

function logProfileFetchFailed(step: string, userId: string, error: unknown) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;
  console.error("CUSTOMER_DASHBOARD_PROFILE_FETCH_FAILED", {
    step,
    userId,
    errorMessage: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    errorCode: supabaseError?.code ?? null,
    errorDetails: supabaseError?.details ?? null,
    errorHint: supabaseError?.hint ?? null,
  });
}

export function getInitialCustomerProfile(user: User): CustomerProfileFormValues {
  return {
    full_name: String(user.user_metadata.full_name ?? user.user_metadata.name ?? "").trim(),
    mobile: user.phone ?? "",
    email: user.email ?? "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    photo_url: String(user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "").trim(),
  };
}

export async function getCustomerProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    await Promise.all([
      ensureReferralCodeForUser(userId).catch(() => null),
      createWalletIfMissing(userId).catch(() => null),
    ]);

    const { data, error } = await supabaseAdmin.from("customer_profiles").select(customerProfileColumns).eq("id", userId).maybeSingle();

    if (error) {
      logProfileFetchFailed("customer_profiles_admin", userId, error);
      return null;
    }

    return (data ?? null) as CustomerProfile | null;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("customer_profiles").select(customerProfileColumns).eq("id", userId).maybeSingle();

  if (error) {
    logProfileFetchFailed("customer_profiles_server", userId, error);
    return null;
  }

  return (data ?? null) as CustomerProfile | null;
}

export async function getCustomerDashboardProfile(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    return null;
  }

  const [profileResult, customerResult, customerProfileResult] = await Promise.allSettled([
    supabaseAdmin.from("profiles").select("id, full_name, mobile, email, avatar_url").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("customers").select("id, full_name, mobile, email").eq("user_id", userId).limit(1).maybeSingle(),
    supabaseAdmin.from("customer_profiles").select("id, full_name, mobile, email, photo_url").eq("id", userId).maybeSingle(),
  ]);

  const values: CustomerDashboardProfile[] = [];

  for (const [index, result] of [profileResult, customerResult, customerProfileResult].entries()) {
    const step = ["profiles", "customers", "customer_profiles"][index] ?? "unknown";

    if (result.status === "rejected") {
      logProfileFetchFailed(`${step}_dashboard_rejected`, userId, result.reason);
      continue;
    }

    if (result.value.error) {
      logProfileFetchFailed(`${step}_dashboard`, userId, result.value.error);
      continue;
    }

    if (result.value.data) {
      values.push(result.value.data as CustomerDashboardProfile);
    }
  }

  return values.reduce<CustomerDashboardProfile>(
    (merged, value) => ({
      ...merged,
      ...Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== "" && item !== undefined)),
    }),
    {},
  );
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
