import { cookies } from "next/headers";

import { findExistingCustomerByMobile, syncProfileMobileFlags } from "@/lib/auth/customer-lookup";
import { isValidPinFormat, validateCustomerPin } from "@/lib/auth/pin";
import { hashPin, verifyPin } from "@/lib/auth-v2/password";
import { signAccessToken } from "@/lib/auth-v2/jwt";
import {
  DEVICE_ID_COOKIE,
  generateRefreshToken,
  hashRefreshToken,
  setAuthCookies,
} from "@/lib/auth-v2/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export { hashPin, verifyPin };

export async function updateCustomerHashedPin(input: {
  customerId: string;
  localPhone: string;
  pin: string;
  profileId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidPinFormat(input.pin) || !/^\d{6}$/.test(input.pin)) {
    return { ok: false, error: "PIN exactly 6 digits hona chahiye." };
  }

  const pinCheck = validateCustomerPin(input.pin, input.localPhone);
  if (!pinCheck.ok) {
    return { ok: false, error: pinCheck.error };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Service unavailable" };
  }

  const hashed = await hashPin(input.pin);
  const { error } = await supabase
    .from("customers")
    .update({
      hashed_pin: hashed,
      is_active: true,
      mobile: input.localPhone,
    })
    .eq("id", input.customerId);

  if (error) {
    console.error("[customer-pin-auth] hashed_pin_update_failed", {
      customerId: input.customerId,
      message: error.message,
    });
    return { ok: false, error: "PIN reset failed" };
  }

  await syncProfileMobileFlags({
    profileId: input.profileId ?? null,
    localPhone: input.localPhone,
  });

  console.info("[customer-pin-auth] pin_updated", {
    "customer id": input.customerId,
    purpose: "forgot_pin",
  });

  return { ok: true };
}

export async function authenticateCustomerWithPin(input: {
  localPhone: string;
  pin: string;
}): Promise<
  | { ok: true; customerId: string; mobile: string; name: string | null }
  | { ok: false; error: string; status: number }
> {
  if (!isValidPinFormat(input.pin)) {
    return { ok: false, error: "PIN exactly 6 digits hona chahiye.", status: 400 };
  }

  const lookup = await findExistingCustomerByMobile(input.localPhone);
  if (!lookup.ok) {
    if (lookup.reason === "ambiguous" || lookup.reason === "profile_only") {
      return { ok: false, error: lookup.message, status: 409 };
    }
    return { ok: false, error: "WhatsApp number ya PIN galat hai.", status: 401 };
  }

  if (!lookup.isActive) {
    return {
      ok: false,
      error: "Account is disabled. Please contact support.",
      status: 403,
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Service unavailable", status: 503 };
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, mobile, name, hashed_pin, is_active")
    .eq("id", lookup.customerId)
    .maybeSingle();

  if (error || !customer) {
    return { ok: false, error: "WhatsApp number ya PIN galat hai.", status: 401 };
  }

  if (!customer.hashed_pin) {
    return {
      ok: false,
      error: "PIN set nahi hai. Forgot / Create PIN use karein.",
      status: 403,
    };
  }

  const valid = await verifyPin(input.pin, String(customer.hashed_pin));
  if (!valid) {
    return { ok: false, error: "WhatsApp number ya PIN galat hai.", status: 401 };
  }

  return {
    ok: true,
    customerId: String(customer.id),
    mobile: input.localPhone,
    name: (customer.name as string | null) ?? lookup.name,
  };
}

/** Create customer JWT session cookies (same stack as customer-auth v2). */
export async function createCustomerPinSession(input: {
  customerId: string;
  mobile: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Service unavailable" };
  }

  try {
    const accessToken = await signAccessToken({
      sub: input.customerId,
      mobile: input.mobile,
      role: "customer",
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresInDays = input.rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const cookieStore = await cookies();
    let deviceIdentifier = cookieStore.get(DEVICE_ID_COOKIE)?.value;
    if (!deviceIdentifier) {
      deviceIdentifier = globalThis.crypto.randomUUID();
    }

    let deviceId: string | null = null;
    try {
      const { data: deviceRecord } = await supabase
        .from("customer_devices")
        .upsert(
          [
            {
              customer_id: input.customerId,
              device_identifier: deviceIdentifier,
              device_name: (input.userAgent ?? "unknown").slice(0, 50),
              last_active: new Date().toISOString(),
            },
          ],
          { onConflict: "customer_id, device_identifier" },
        )
        .select("id")
        .maybeSingle();
      deviceId = deviceRecord?.id ? String(deviceRecord.id) : null;
    } catch {
      deviceId = null;
    }

    try {
      await supabase.from("customer_sessions").insert([
        {
          customer_id: input.customerId,
          refresh_token_hash: refreshTokenHash,
          expires_at: expiresAt.toISOString(),
          user_agent: input.userAgent ?? null,
          ip_address: input.ipAddress ?? null,
          device_id: deviceId,
        },
      ]);
    } catch (sessionError) {
      console.warn("[customer-pin-auth] session_insert_skipped", {
        customerId: input.customerId,
        message: sessionError instanceof Error ? sessionError.message : String(sessionError),
      });
    }

    await setAuthCookies(accessToken, refreshToken, deviceIdentifier);
    return { ok: true };
  } catch (error) {
    console.error("[customer-pin-auth] session_create_failed", {
      customerId: input.customerId,
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Login failed" };
  }
}
