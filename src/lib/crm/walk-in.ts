import "server-only";

import { randomInt } from "crypto";

import { customerInternalEmail } from "@/lib/auth/phone";
import { derivePinPassword, validateCustomerPin } from "@/lib/auth/pin";
import {
  assertCustomerIdentityAvailable,
  completeCustomerAccount,
  normalizeCustomerMobile,
} from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { scheduleCrmSync } from "@/lib/crmSync";

export type WalkInCustomerRecord = {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  pincode: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
};

export type WalkInApplicationSummary = {
  id: string;
  serviceName: string | null;
  status: string | null;
  createdAt: string | null;
};

function generateSecurePin(localPhone: string): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = String(randomInt(100000, 1000000));
    if (validateCustomerPin(pin, localPhone).ok) return pin;
  }
  // Extremely unlikely; still avoid weak sequential defaults.
  return String(randomInt(204812, 987654));
}

export async function lookupCustomerByMobile(mobileInput: string): Promise<{
  ok: true;
  mobile: string;
  customer: WalkInCustomerRecord | null;
  recentApplications: WalkInApplicationSummary[];
} | { ok: false; error: string; status: number }> {
  const mobile = normalizeCustomerMobile(mobileInput);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, error: "Enter a valid 10-digit Indian mobile number.", status: 400 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  type CustomerRow = {
    id: string;
    full_name?: string | null;
    name?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
    pincode?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
  };

  let row: CustomerRow | null = null;
  const primary = await supabase
    .from("customers")
    .select("id, full_name, mobile, email, address, pincode, city, district, state")
    .eq("mobile", mobile)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (primary.error && !String(primary.error.message || "").toLowerCase().includes("column")) {
    console.error("[walk-in] lookup_failed", { error: primary.error.message });
    return { ok: false, error: "Customer lookup failed.", status: 500 };
  }

  row = (primary.data as CustomerRow | null) ?? null;

  if (!row) {
    return { ok: true, mobile, customer: null, recentApplications: [] };
  }

  const { data: apps } = await supabase
    .from("applications")
    .select("id, service_name, status, created_at")
    .eq("customer_id", row.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const rawEmail = row.email ? String(row.email) : null;
  // Never expose generated internal auth emails to CRM UI / messaging.
  const publicEmail =
    rawEmail && !rawEmail.toLowerCase().endsWith("@customer.rnos.internal") ? rawEmail : null;

  return {
    ok: true,
    mobile,
    customer: {
      id: String(row.id),
      fullName: String(row.full_name || row.name || "Customer"),
      mobile: String(row.mobile || mobile),
      email: publicEmail,
      address: row.address ?? null,
      pincode: row.pincode ?? null,
      city: row.city ?? null,
      district: row.district ?? null,
      state: row.state ?? null,
    },
    recentApplications: (apps ?? []).map((app) => ({
      id: String(app.id),
      serviceName: app.service_name ?? null,
      status: app.status ?? null,
      createdAt: app.created_at ?? null,
    })),
  };
}

export async function createWalkInCustomer(input: {
  fullName: string;
  mobile: string;
  alternateMobile?: string | null;
  address: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  referralSource?: string | null;
  createdByUserId: string;
}): Promise<
  | {
      ok: true;
      customerId: string;
      userId: string;
      mobile: string;
      temporaryPin: string;
      messaging: "queued" | "skipped" | "failed";
    }
  | { ok: false; error: string; status: number }
> {
  const mobile = normalizeCustomerMobile(input.mobile);
  const fullName = input.fullName.trim();
  const address = input.address.trim();
  const pincode = String(input.pincode ?? "").replace(/\D/g, "").slice(0, 6);
  const city = input.city.trim();
  const district = input.district.trim();
  const state = input.state.trim();

  if (!fullName || !address || !city || !district || !state) {
    return { ok: false, error: "Name, address, city, district, and state are required.", status: 400 };
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, error: "Enter a valid 10-digit Indian mobile number.", status: 400 };
  }
  if (!/^\d{6}$/.test(pincode)) {
    return { ok: false, error: "Enter a valid 6-digit PIN code.", status: 400 };
  }

  const existing = await lookupCustomerByMobile(mobile);
  if (!existing.ok) return existing;
  if (existing.customer) {
    return { ok: false, error: "Customer already exists for this mobile. Use the existing record.", status: 409 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const email = customerInternalEmail(mobile);
  const available = await assertCustomerIdentityAvailable(supabase, { email, mobile });
  if (available?.ok === false) {
    return {
      ok: false,
      error: available.message || "Identity not available.",
      status: 409,
    };
  }

  const temporaryPin = generateSecurePin(mobile);
  const password = derivePinPassword(mobile, temporaryPin);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      mobile,
      role: "customer",
      must_change_pin: true,
      source: "admin_walk_in",
      referral_source: input.referralSource ?? null,
      alternate_mobile: input.alternateMobile ?? null,
    },
    app_metadata: { role: "customer" },
  });

  if (createError || !created.user?.id) {
    console.error("[walk-in] auth_create_failed", { error: createError?.message });
    return { ok: false, error: createError?.message || "Could not create customer login.", status: 500 };
  }

  try {
    await completeCustomerAccount(supabase, {
      userId: created.user.id,
      email,
      mobile,
      fullName,
      pincode,
      city,
      district,
      state,
      address,
      source: "offline",
      createdBy: input.createdByUserId,
    });
  } catch (error) {
    console.error("[walk-in] complete_account_failed", {
      userId: created.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    // Best-effort cleanup of orphan auth user
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return { ok: false, error: "Customer profile could not be completed.", status: 500 };
  }

  const { data: customerRow } = await supabase
    .from("customers")
    .select("id")
    .eq("mobile", mobile)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = customerRow?.id ? String(customerRow.id) : created.user.id;

  // Soft-update CRM fields that completeCustomerAccount may not set.
  try {
    await supabase
      .from("customers")
      .update({
        address,
        pincode,
        city,
        district,
        state,
        created_by: input.createdByUserId,
        source: "offline",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);
  } catch {
    // Optional columns may differ across environments.
  }

  // Do not auto-send a signup OTP here — that would mint a different code than temporaryPin.
  // Counter staff sees temporaryPin once; WhatsApp welcome templates are Phase 5 outbox work.
  const messaging: "queued" | "skipped" | "failed" = "skipped";

  return {
    ok: true,
    customerId,
    userId: created.user.id,
    mobile,
    temporaryPin,
    messaging,
  };
}

/** After application create, schedule Sheets sync (non-blocking for caller if awaited). */
export async function scheduleWalkInApplicationSync(applicationId: string) {
  await scheduleCrmSync(applicationId, "application_created");
}
