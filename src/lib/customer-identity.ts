import type { User } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const CUSTOMER_EXISTS_MESSAGE = "Customer already exists with this email/mobile number.";
export const INCOMPLETE_ACCOUNT_MESSAGE =
  "Account was created earlier but profile was incomplete. Please verify your email or contact admin.";

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

type CustomerIdentityInput = {
  email: string;
  mobile: string;
  excludeUserId?: string | null;
  excludeCustomerId?: string | null;
};

type CustomerSyncInput = {
  userId: string;
  fullName: string;
  email: string;
  mobile: string;
  pincode?: string;
  city?: string;
  state?: string;
  address?: string;
  source?: "online" | "offline" | "agent_pos";
  createdBy?: string | null;
};

type CompleteCustomerAccountInput = CustomerSyncInput & {
  avatarUrl?: string;
  skipCustomers?: boolean;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCustomerMobile(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function hasDifferentUserId(row: { id?: string | null; user_id?: string | null } | null, excludeUserId?: string | null) {
  const rowUserId = row?.user_id ?? row?.id ?? null;
  return Boolean(rowUserId && excludeUserId && rowUserId !== excludeUserId);
}

function hasDifferentCustomerId(row: { id?: string | null } | null, excludeCustomerId?: string | null) {
  return Boolean(row?.id && excludeCustomerId && row.id !== excludeCustomerId);
}

export async function findAuthUserByEmailOrMobile(
  supabase: SupabaseAdminClient,
  email: string,
  mobile: string,
  excludeUserId?: string | null,
) {
  const targetEmail = normalizeEmail(email);
  const targetMobile = normalizeCustomerMobile(mobile);
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const duplicate = data.users.find((user: User) => {
      if (excludeUserId && user.id === excludeUserId) {
        return false;
      }

      const userEmail = normalizeEmail(user.email ?? "");
      const userMobile = normalizeCustomerMobile(
        String(user.phone ?? user.user_metadata.mobile ?? user.user_metadata.phone ?? ""),
      );

      return Boolean((targetEmail && userEmail === targetEmail) || (targetMobile && userMobile === targetMobile));
    });

    if (duplicate) {
      return duplicate;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }

  return null;
}

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("could not find") || message.includes("does not exist");
}

export function isCustomerUniqueConstraintError(error: unknown) {
  const message = String(error instanceof Error ? error.message : (error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    message.includes("customer already exists") ||
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("_unique_idx")
  );
}

export function getSupabaseErrorDebug(error: unknown) {
  const supabaseError = error as { message?: string; code?: string; details?: string; hint?: string } | null;

  return {
    code: supabaseError?.code ?? null,
    message: error instanceof Error ? error.message : supabaseError?.message ?? String(error),
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
  };
}

function isMissingTableOrColumnError(error: unknown) {
  const { message, code } = getSupabaseErrorDebug(error);
  const normalized = message.toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    normalized.includes("could not find") ||
    normalized.includes("does not exist") ||
    normalized.includes("schema cache")
  );
}

function logCustomerSyncFailure(step: string, input: CustomerSyncInput, error: unknown) {
  const debug = getSupabaseErrorDebug(error);
  console.error("SIGNUP_CUSTOMER_SYNC_FAILED", {
    step,
    email: input.email,
    mobile: input.mobile,
    userId: input.userId,
    errorCode: debug.code,
    errorMessage: debug.message,
    errorDetails: debug.details,
    errorHint: debug.hint,
  });
}

function logCustomersUpsertFailed(step: string, input: CustomerSyncInput, error: unknown, payload: Record<string, unknown>) {
  const debug = getSupabaseErrorDebug(error);
  console.error("CUSTOMERS_UPSERT_FAILED", {
    step,
    email: input.email,
    mobile: input.mobile,
    userId: input.userId,
    errorCode: debug.code,
    errorMessage: debug.message,
    errorDetails: debug.details,
    errorHint: debug.hint,
    payloadKeys: Object.keys(payload),
  });
}

function logIdentityStepStart(step: string, input: CustomerSyncInput) {
  console.info(`${step}_START`, {
    email: input.email,
    mobile: input.mobile,
    userId: input.userId,
  });
}

function logIdentityStepFail(step: string, input: CustomerSyncInput, error: unknown) {
  const debug = getSupabaseErrorDebug(error);
  console.error(`${step}_FAIL`, {
    email: input.email,
    mobile: input.mobile,
    userId: input.userId,
    errorCode: debug.code,
    errorMessage: debug.message,
    errorDetails: debug.details,
    errorHint: debug.hint,
    stack: error instanceof Error ? error.stack : null,
  });
}

export async function assertCustomerIdentityAvailable(
  supabase: SupabaseAdminClient,
  input: CustomerIdentityInput,
) {
  const email = normalizeEmail(input.email);
  const mobile = normalizeCustomerMobile(input.mobile);

  if (!email || !mobile) {
    return;
  }

  const authDuplicate = await findAuthUserByEmailOrMobile(supabase, email, mobile, input.excludeUserId);

  if (authDuplicate) {
    return { ok: false as const, message: CUSTOMER_EXISTS_MESSAGE };
  }

  const [profileEmail, profileMobile, customerEmail, customerMobile, customerProfileEmail, customerProfileMobile] =
    await Promise.all([
      supabase.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle(),
      supabase.from("profiles").select("id").eq("mobile", mobile).limit(1).maybeSingle(),
      supabase.from("customers").select("id, user_id").ilike("email", email).limit(1).maybeSingle(),
      supabase.from("customers").select("id, user_id").eq("mobile", mobile).limit(1).maybeSingle(),
      supabase.from("customer_profiles").select("id, user_id").ilike("email", email).limit(1).maybeSingle(),
      supabase.from("customer_profiles").select("id, user_id").eq("mobile", mobile).limit(1).maybeSingle(),
    ]);

  const lookupError =
    profileEmail.error ||
    profileMobile.error ||
    customerEmail.error ||
    customerMobile.error ||
    customerProfileEmail.error ||
    customerProfileMobile.error;

  if (lookupError) {
    throw lookupError;
  }

  const publicDuplicate =
    hasDifferentUserId(profileEmail.data, input.excludeUserId) ||
    hasDifferentUserId(profileMobile.data, input.excludeUserId) ||
    hasDifferentUserId(customerProfileEmail.data, input.excludeUserId) ||
    hasDifferentUserId(customerProfileMobile.data, input.excludeUserId) ||
    hasDifferentUserId(customerEmail.data, input.excludeUserId) ||
    hasDifferentUserId(customerMobile.data, input.excludeUserId) ||
    hasDifferentCustomerId(customerEmail.data, input.excludeCustomerId) ||
    hasDifferentCustomerId(customerMobile.data, input.excludeCustomerId);

  if (publicDuplicate) {
    return { ok: false as const, message: CUSTOMER_EXISTS_MESSAGE };
  }

  return { ok: true as const };
}

export async function syncCustomerIdentity(supabase: SupabaseAdminClient, input: CustomerSyncInput) {
  logIdentityStepStart("CUSTOMERS_SYNC", input);
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const mobile = normalizeCustomerMobile(input.mobile);
  const customerName = input.fullName.trim() || "Customer";

  const minimalCustomerPayload = {
    user_id: input.userId,
    email,
    mobile,
    full_name: customerName,
  };
  const minimalCustomerUpdatePayload = {
    ...minimalCustomerPayload,
    updated_at: now,
  };

  const ownCustomerResult = await supabase.from("customers").select("id, user_id").eq("user_id", input.userId).limit(1).maybeSingle();

  if (ownCustomerResult.error && !isMissingTableOrColumnError(ownCustomerResult.error)) {
    logIdentityStepFail("CUSTOMERS_SYNC", input, ownCustomerResult.error);
    logCustomersUpsertFailed("customers_lookup_by_user_id", input, ownCustomerResult.error, { user_id: input.userId });
    throw ownCustomerResult.error;
  }

  let existingCustomer = ownCustomerResult.data as { id: string; user_id: string | null } | null;

  if (!existingCustomer && email) {
    const emailCustomerResult = await supabase.from("customers").select("id, user_id").ilike("email", email).limit(1).maybeSingle();

    if (emailCustomerResult.error && !isMissingTableOrColumnError(emailCustomerResult.error)) {
      logIdentityStepFail("CUSTOMERS_SYNC", input, emailCustomerResult.error);
      logCustomersUpsertFailed("customers_lookup_by_email", input, emailCustomerResult.error, { email });
      throw emailCustomerResult.error;
    }

    const row = emailCustomerResult.data as { id: string; user_id: string | null } | null;
    if (row && (!row.user_id || row.user_id === input.userId)) {
      existingCustomer = row;
    }
  }

  if (!existingCustomer && mobile) {
    const mobileCustomerResult = await supabase.from("customers").select("id, user_id").eq("mobile", mobile).limit(1).maybeSingle();

    if (mobileCustomerResult.error && !isMissingTableOrColumnError(mobileCustomerResult.error)) {
      logIdentityStepFail("CUSTOMERS_SYNC", input, mobileCustomerResult.error);
      logCustomersUpsertFailed("customers_lookup_by_mobile", input, mobileCustomerResult.error, { mobile });
      throw mobileCustomerResult.error;
    }

    const row = mobileCustomerResult.data as { id: string; user_id: string | null } | null;
    if (row && (!row.user_id || row.user_id === input.userId)) {
      existingCustomer = row;
    }
  }

  if (existingCustomer?.id) {
    const { error } = await supabase.from("customers").update(minimalCustomerUpdatePayload).eq("id", existingCustomer.id);

    if (error) {
      logCustomersUpsertFailed("customers_update_minimal_with_updated_at", input, error, minimalCustomerUpdatePayload);
      logCustomerSyncFailure("customers_update_minimal_with_updated_at", input, error);

      if (!isMissingTableOrColumnError(error)) {
        logIdentityStepFail("CUSTOMERS_SYNC", input, error);
        throw error;
      }

      const { error: fallbackError } = await supabase.from("customers").update(minimalCustomerPayload).eq("id", existingCustomer.id);

      if (fallbackError) {
        logCustomersUpsertFailed("customers_update_minimal", input, fallbackError, minimalCustomerPayload);
        logCustomerSyncFailure("customers_update_minimal", input, fallbackError);
        logIdentityStepFail("CUSTOMERS_SYNC", input, fallbackError);
        throw fallbackError;
      }
    }
  } else {
    const upsertPayload = {
      ...minimalCustomerUpdatePayload,
      created_at: now,
    };
    const upsertResult = await supabase
      .from("customers")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("id")
      .maybeSingle();

    if (!upsertResult.error && upsertResult.data) {
      existingCustomer = { id: upsertResult.data.id, user_id: input.userId };
    } else {
      if (upsertResult.error) {
        logCustomersUpsertFailed("customers_upsert_user_id_minimal", input, upsertResult.error, upsertPayload);
        logCustomerSyncFailure("customers_upsert_user_id_minimal", input, upsertResult.error);
      }

      const insertResult = await supabase.from("customers").insert(minimalCustomerPayload).select("id").maybeSingle();

      if (!insertResult.error && insertResult.data) {
        existingCustomer = { id: insertResult.data.id, user_id: input.userId };
      } else if (insertResult.error && isMissingTableOrColumnError(insertResult.error)) {
        logCustomersUpsertFailed("customers_insert_minimal", input, insertResult.error, minimalCustomerPayload);
        logCustomerSyncFailure("customers_insert_minimal", input, insertResult.error);

        const insertWithTimestampsResult = await supabase.from("customers").insert(upsertPayload).select("id").maybeSingle();

        if (insertWithTimestampsResult.error) {
          logCustomersUpsertFailed("customers_insert_minimal_with_timestamps", input, insertWithTimestampsResult.error, upsertPayload);
          logCustomerSyncFailure("customers_insert_minimal_with_timestamps", input, insertWithTimestampsResult.error);
          logIdentityStepFail("CUSTOMERS_SYNC", input, insertWithTimestampsResult.error);
          throw insertWithTimestampsResult.error;
        }

        existingCustomer = insertWithTimestampsResult.data ? { id: insertWithTimestampsResult.data.id, user_id: input.userId } : null;
      } else if (insertResult.error) {
        logCustomersUpsertFailed("customers_insert_minimal", input, insertResult.error, minimalCustomerPayload);
        logCustomerSyncFailure("customers_insert_minimal", input, insertResult.error);

        if (upsertResult.error) {
          logIdentityStepFail("CUSTOMERS_SYNC", input, insertResult.error);
          throw insertResult.error;
        }
      }
    }
  }

  console.info("CUSTOMERS_SYNC_OK", {
    email,
    mobile,
    userId: input.userId,
    customerId: existingCustomer?.id ?? null,
  });

  logIdentityStepStart("CUSTOMER_PROFILES_SYNC", input);
  const { error: customerProfileError } = await supabase.from("customer_profiles").upsert(
    {
      id: input.userId,
      user_id: input.userId,
      full_name: customerName,
      email,
      mobile,
      pincode: input.pincode ?? "",
      city: input.city ?? "",
      state: input.state ?? "",
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (customerProfileError) {
    logCustomerSyncFailure("customer_profiles_upsert_full", input, customerProfileError);

    if (!isMissingTableOrColumnError(customerProfileError)) {
      logIdentityStepFail("CUSTOMER_PROFILES_SYNC", input, customerProfileError);
      throw customerProfileError;
    }

    const { error: fallbackError } = await supabase.from("customer_profiles").upsert(
      {
        id: input.userId,
        full_name: customerName,
        email,
        mobile,
        city: input.city ?? "",
        state: input.state ?? "",
        pincode: input.pincode ?? "",
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (fallbackError) {
      logCustomerSyncFailure("customer_profiles_upsert_minimal", input, fallbackError);

      if (!isMissingTableOrColumnError(fallbackError)) {
        throw fallbackError;
      }

      const { error: ultraMinimalError } = await supabase.from("customer_profiles").upsert(
        {
          id: input.userId,
          full_name: customerName,
          email,
          mobile,
        },
        { onConflict: "id" },
      );

      if (ultraMinimalError) {
        logCustomerSyncFailure("customer_profiles_upsert_ultra_minimal", input, ultraMinimalError);
        logIdentityStepFail("CUSTOMER_PROFILES_SYNC", input, ultraMinimalError);
        throw ultraMinimalError;
      }
    }
  }

  console.info("CUSTOMER_PROFILES_SYNC_OK", {
    email,
    mobile,
    userId: input.userId,
  });

  return existingCustomer?.id ?? null;
}

export async function completeCustomerAccount(supabase: SupabaseAdminClient, input: CompleteCustomerAccountInput) {
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const mobile = normalizeCustomerMobile(input.mobile);
  const fullName = input.fullName.trim() || "Customer";
  logIdentityStepStart("PROFILE_SYNC", input);
  const profilePayload = {
    id: input.userId,
    full_name: fullName,
    email,
    mobile,
    role: "customer",
    pincode: input.pincode ?? "",
    city: input.city ?? "",
    state: input.state ?? "",
    active: true,
    is_active: true,
    avatar_url: input.avatarUrl ?? "",
    updated_at: now,
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    if (isMissingColumnError(profileError)) {
      const { error: fallbackProfileError } = await supabase.from("profiles").upsert(
        {
          id: input.userId,
          full_name: fullName,
          email,
          mobile,
          role: "customer",
          updated_at: now,
        },
        { onConflict: "id" },
      );

      if (fallbackProfileError) {
        logIdentityStepFail("PROFILE_SYNC", input, fallbackProfileError);
        throw fallbackProfileError;
      }
    } else {
      logIdentityStepFail("PROFILE_SYNC", input, profileError);
      throw profileError;
    }
  }

  console.info("PROFILE_SYNC_OK", {
    email,
    mobile,
    userId: input.userId,
  });

  let customerId: string | null = null;

  if (input.skipCustomers) {
    console.warn("CUSTOMERS_SYNC_BYPASSED_FOR_SIGNUP_TEST", {
      email,
      mobile,
      userId: input.userId,
    });

    logIdentityStepStart("CUSTOMER_PROFILES_SYNC", input);
    const { error: customerProfileError } = await supabase.from("customer_profiles").upsert(
      {
        id: input.userId,
        user_id: input.userId,
        full_name: fullName,
        email,
        mobile,
        pincode: input.pincode ?? "",
        city: input.city ?? "",
        state: input.state ?? "",
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (customerProfileError) {
      logCustomerSyncFailure("customer_profiles_upsert_full_without_customers", input, customerProfileError);

      if (!isMissingTableOrColumnError(customerProfileError)) {
        logIdentityStepFail("CUSTOMER_PROFILES_SYNC", input, customerProfileError);
        throw customerProfileError;
      }

      const { error: fallbackError } = await supabase.from("customer_profiles").upsert(
        {
          id: input.userId,
          full_name: fullName,
          email,
          mobile,
        },
        { onConflict: "id" },
      );

      if (fallbackError) {
        logIdentityStepFail("CUSTOMER_PROFILES_SYNC", input, fallbackError);
        throw fallbackError;
      }
    }

    console.info("CUSTOMER_PROFILES_SYNC_OK", {
      email,
      mobile,
      userId: input.userId,
    });
  } else {
    customerId = await syncCustomerIdentity(supabase, {
      userId: input.userId,
      fullName,
      email,
      mobile,
      pincode: input.pincode,
      city: input.city,
      state: input.state,
      address: input.address,
      source: input.source,
      createdBy: input.createdBy,
    });
  }

  logIdentityStepStart("USERS_SYNC", input);
  const { error: userError } = await supabase.from("users").upsert(
    {
      id: input.userId,
      full_name: fullName,
      email,
      role: "customer",
      avatar_url: input.avatarUrl ?? "",
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (userError) {
    logIdentityStepFail("USERS_SYNC", input, userError);
    const debug = getSupabaseErrorDebug(userError);
    console.error("SIGNUP_CUSTOMER_SYNC_FAILED", {
      step: "legacy_users_upsert_optional",
      email,
      mobile,
      userId: input.userId,
      errorCode: debug.code,
      errorMessage: debug.message,
      errorDetails: debug.details,
      errorHint: debug.hint,
    });
  } else {
    console.info("USERS_SYNC_OK", {
      email,
      mobile,
      userId: input.userId,
    });
  }

  return customerId;
}
