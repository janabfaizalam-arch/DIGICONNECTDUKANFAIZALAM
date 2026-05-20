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
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const mobile = normalizeCustomerMobile(input.mobile);
  const customerName = input.fullName.trim() || "Customer";

  const existingCustomerQueries = [
    supabase.from("customers").select("id, user_id").eq("user_id", input.userId).maybeSingle(),
    email ? supabase.from("customers").select("id, user_id").ilike("email", email).limit(1).maybeSingle() : null,
    mobile ? supabase.from("customers").select("id, user_id").eq("mobile", mobile).limit(1).maybeSingle() : null,
  ].filter(Boolean) as PromiseLike<{ data: { id: string; user_id: string | null } | null }>[];

  const existingResults = await Promise.all(existingCustomerQueries);
  let existingCustomer = existingResults
    .map((result) => result.data as { id: string; user_id: string | null } | null)
    .find((row) => row && (!row.user_id || row.user_id === input.userId));

  const customerPayload = {
    user_id: input.userId,
    full_name: customerName,
    email,
    mobile,
    pincode: input.pincode ?? "",
    city: input.city ?? "",
    state: input.state ?? "",
    address: input.address ?? "",
    source: input.source ?? "online",
    updated_at: now,
  };

  if (existingCustomer?.id) {
    await supabase.from("customers").update(customerPayload).eq("id", existingCustomer.id);
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        ...customerPayload,
        created_by: input.createdBy ?? null,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    existingCustomer = data ? { id: data.id, user_id: input.userId } : null;
  }

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
    throw customerProfileError;
  }

  return existingCustomer?.id ?? null;
}

export async function completeCustomerAccount(supabase: SupabaseAdminClient, input: CompleteCustomerAccountInput) {
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const mobile = normalizeCustomerMobile(input.mobile);
  const fullName = input.fullName.trim() || "Customer";
  const customerId = await syncCustomerIdentity(supabase, {
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
          pincode: input.pincode ?? "",
          city: input.city ?? "",
          state: input.state ?? "",
          avatar_url: input.avatarUrl ?? "",
          updated_at: now,
        },
        { onConflict: "id" },
      );

      if (fallbackProfileError) {
        throw fallbackProfileError;
      }
    } else {
      throw profileError;
    }
  }

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
    throw userError;
  }

  return customerId;
}
