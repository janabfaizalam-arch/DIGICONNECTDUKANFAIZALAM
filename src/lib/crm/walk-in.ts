import "server-only";

import { randomInt, randomUUID } from "crypto";

import { customerInternalEmail } from "@/lib/auth/phone";
import { derivePinPassword, validateCustomerPin } from "@/lib/auth/pin";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";
import { hashPin } from "@/lib/auth-v2/password";
import {
  assertCustomerIdentityAvailable,
  completeCustomerAccount,
  findAuthUserByEmailOrMobile,
  normalizeCustomerMobile,
} from "@/lib/customer-identity";
import {
  classifyWalkInCleanupOutcome,
  type WalkInCleanupStep,
  walkInReconciliationClientError,
} from "@/lib/crm/walk-in-application-core";
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
  // Keep drawing until the PIN clears the same strength rules the customer's
  // own PIN must pass — a hardcoded fallback could hand out a rejected PIN.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const pin = String(randomInt(100000, 1000000));
    if (validateCustomerPin(pin, localPhone).ok) return pin;
  }
  throw new Error("Could not generate a secure temporary PIN.");
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
    .select("id, name, mobile, email, address, pincode, city, district, state")
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
      fullName: String(row.name || "Customer"),
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
  | {
      ok: false;
      error: string;
      status: number;
      reconciliationRequired?: true;
      correlationId?: string;
    }
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
  let available: Awaited<ReturnType<typeof assertCustomerIdentityAvailable>>;
  try {
    available = await assertCustomerIdentityAvailable(supabase, { email, mobile });
  } catch (error) {
    console.error("[walk-in] identity_check_threw", {
      code: error instanceof Error ? error.message.slice(0, 80) : "identity_check_failed",
    });
    return { ok: false, error: "Identity check failed. Please try again.", status: 500 };
  }
  if (available?.ok === false) {
    return {
      ok: false,
      error: available.message || "Identity not available.",
      status: 409,
    };
  }

  const temporaryPin = generateSecurePin(mobile);
  // Primary login verifier for /api/customer-auth/login: argon2id (per-hash salt + work factor).
  // Supabase Auth password remains HMAC-derived for complete-signup compatibility only —
  // GoTrue still bcrypt-hashes that password. See CRM_DATABASE_CHANGES.md PIN threat notes.
  const hashedPin = await hashPin(temporaryPin);
  const password = derivePinPassword(mobile, temporaryPin);

  // Request-scoped ownership for compensating cleanup (never delete pre-existing rows).
  let requestCreatedAuthUserId: string | null = null;
  let requestCreatedCustomerId: string | null = null;

  const runCompensatingCleanup = async (): Promise<{
    customerCleanup: WalkInCleanupStep;
    authCleanup: WalkInCleanupStep;
    correlationId: string;
  }> => {
    const correlationId = randomUUID();
    let customerCleanup: WalkInCleanupStep = "skipped_not_owned";
    let authCleanup: WalkInCleanupStep = "skipped_not_owned";

    // Order: customer row first, then Auth user. Only request-created IDs.
    if (requestCreatedCustomerId) {
      const { error } = await supabase.from("customers").delete().eq("id", requestCreatedCustomerId);
      if (error) {
        customerCleanup = "failed";
      } else {
        customerCleanup = "deleted";
      }
    }

    if (requestCreatedAuthUserId) {
      const { error } = await supabase.auth.admin.deleteUser(requestCreatedAuthUserId);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        authCleanup = msg.includes("not found") || msg.includes("does not exist") ? "missing" : "failed";
      } else {
        authCleanup = "deleted";
      }
    }

    const outcome = classifyWalkInCleanupOutcome({ customerCleanup, authCleanup });
    if (outcome.reconciliationRequired) {
      console.error("[walk-in] HIGH_SEVERITY_ORPHAN_RECONCILIATION", {
        correlationId,
        customerCleanup,
        authCleanup,
        // Never log PIN, email, phone, hash, or secrets.
        requestOwnedAuth: Boolean(requestCreatedAuthUserId),
        requestOwnedCustomer: Boolean(requestCreatedCustomerId),
      });
    }

    return { customerCleanup, authCleanup, correlationId };
  };

  // Idempotent remnant recovery: prior request may have created Auth without customer (or both).
  try {
    const remnantAuth = await findAuthUserByEmailOrMobile(supabase, email, mobile);
    if (remnantAuth?.id) {
      const source = String(remnantAuth.user_metadata?.source ?? "");
      const remnantMobile = normalizeCustomerMobile(
        String(remnantAuth.user_metadata?.mobile ?? remnantAuth.phone ?? ""),
      );
      if (source === "admin_walk_in" && remnantMobile === mobile) {
        const { data: remnantCustomer } = await supabase
          .from("customers")
          .select("id, hashed_pin")
          .eq("id", remnantAuth.id)
          .maybeSingle();

        if (remnantCustomer?.id) {
          // Fully linked remnant — do not mint another Auth/customer; force PIN refresh only if unset.
          if (!remnantCustomer.hashed_pin) {
            await supabase
              .from("customers")
              .update({ hashed_pin: hashedPin, name: fullName, is_active: true })
              .eq("id", remnantCustomer.id);
            return {
              ok: true,
              customerId: String(remnantCustomer.id),
              userId: remnantAuth.id,
              mobile,
              temporaryPin,
              messaging: "skipped",
            };
          }
          return {
            ok: false,
            error: "Customer already exists for this mobile. Use the existing record.",
            status: 409,
          };
        }

        // Auth remnant without customer row — complete customer insert only (no second Auth user).
        const { error: remnantInsertError } = await supabase.from("customers").insert({
          id: remnantAuth.id,
          name: fullName,
          mobile,
          email,
          address,
          pincode,
          city,
          district,
          state,
          hashed_pin: hashedPin,
          is_active: true,
        });
        if (remnantInsertError) {
          console.error("[walk-in] remnant_customer_insert_failed", {
            code: "walk_in_remnant_insert_failed",
          });
          return { ok: false, error: "Customer profile could not be completed.", status: 500 };
        }
        requestCreatedCustomerId = remnantAuth.id;
        try {
          await completeCustomerAccount(supabase, {
            userId: remnantAuth.id,
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
            skipCustomers: true,
          });
        } catch {
          // Profile sync best-effort; customer row is authoritative for PIN login.
        }
        return {
          ok: true,
          customerId: remnantAuth.id,
          userId: remnantAuth.id,
          mobile,
          temporaryPin,
          messaging: "skipped",
        };
      }
    }
  } catch (error) {
    console.error("[walk-in] remnant_lookup_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

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
      // Never store temporaryPin in metadata.
    },
    app_metadata: { role: "customer" },
  });

  if (createError || !created.user?.id) {
    console.error("[walk-in] auth_create_failed", { code: createError?.code ?? "auth_create_failed" });
    return { ok: false, error: "Could not create customer login.", status: 500 };
  }

  requestCreatedAuthUserId = created.user.id;
  const authUserId = created.user.id;

  try {
    // Production customers schema: id + name (no customers.user_id / full_name).
    // Canonical Auth linkage: customers.id == auth.users.id (one UUID).
    // skipCustomers on profile sync prevents a second customers write via legacy user_id path.
    const { error: customerInsertError } = await supabase.from("customers").insert({
      id: authUserId,
      name: fullName,
      mobile,
      email,
      address,
      pincode,
      city,
      district,
      state,
      hashed_pin: hashedPin,
      is_active: true,
    });

    if (customerInsertError) {
      throw new Error("customers_insert_failed");
    }
    requestCreatedCustomerId = authUserId;

    await completeCustomerAccount(supabase, {
      userId: authUserId,
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
      skipCustomers: true,
    });
  } catch (error) {
    console.error("[walk-in] complete_account_failed", {
      code: error instanceof Error ? error.message : "complete_account_failed",
      requestOwnedAuth: Boolean(requestCreatedAuthUserId),
      requestOwnedCustomer: Boolean(requestCreatedCustomerId),
    });

    const cleanup = await runCompensatingCleanup();
    const outcome = classifyWalkInCleanupOutcome({
      customerCleanup: cleanup.customerCleanup,
      authCleanup: cleanup.authCleanup,
    });
    if (outcome.reconciliationRequired) {
      return walkInReconciliationClientError(cleanup.correlationId);
    }
    return { ok: false, error: "Customer profile could not be completed.", status: 500 };
  }

  const customerId = authUserId;

  try {
    await supabase
      .from("customers")
      .update({
        address,
        pincode,
        city,
        district,
        state,
        hashed_pin: hashedPin,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);
  } catch {
    // Optional columns may differ across environments.
  }

  await logAuthSecurityEvent({
    userId: authUserId,
    phone: `${mobile.slice(0, 2)}******${mobile.slice(-2)}`,
    eventType: "walk_in_temporary_pin_issued",
    details: {
      customerId,
      must_change_pin: true,
      actorId: input.createdByUserId,
      // Never include temporaryPin or hashed_pin.
    },
  });

  // Do not auto-send a signup OTP here — that would mint a different code than temporaryPin.
  // Counter staff sees temporaryPin once; WhatsApp welcome templates are Phase 5 outbox work.
  const messaging: "queued" | "skipped" | "failed" = "skipped";

  return {
    ok: true,
    customerId,
    userId: authUserId,
    mobile,
    temporaryPin,
    messaging,
  };
}

/** After application create, schedule Sheets sync (non-blocking for caller if awaited). */
export async function scheduleWalkInApplicationSync(applicationId: string) {
  await scheduleCrmSync(applicationId, "application_created");
}
