/**
 * Ensure Faiz Alam is the only primary admin in Auth + profiles.
 *
 * Usage:
 *   node scripts/ensure-primary-admin.mjs
 *
 * Optional:
 *   PRIMARY_ADMIN_PASSWORD=...   # set/update email login password
 *   PRIMARY_ADMIN_PIN=123456     # set/update customers.hashed_pin for mobile login
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional for PIN: uses argon2id via dynamic import of project's hash helper through a tiny inline argon2.
 */

import { createClient } from "@supabase/supabase-js";
import argon2 from "argon2";

const PRIMARY = {
  fullName: "Faiz Alam",
  email: "janabfaizalam@gmail.com",
  mobile: "7007595931",
};

const DEMOTED = ["dgcntdkn@gmail.com"];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

async function findAuthUserByEmail(supabase, email) {
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((user) => String(user.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 200) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[ensure-primary-admin] starting…");

  // Demote former admins
  for (const email of DEMOTED) {
    const former = await findAuthUserByEmail(supabase, email);
    if (former) {
      await supabase.auth.admin.updateUserById(former.id, {
        app_metadata: { ...(former.app_metadata ?? {}), role: "customer" },
        user_metadata: { ...(former.user_metadata ?? {}), role: "customer" },
      });
      await supabase
        .from("profiles")
        .update({ role: "customer" })
        .eq("id", former.id);
      console.log(`[ensure-primary-admin] demoted ${email} → customer`);
    } else {
      await supabase.from("profiles").update({ role: "customer" }).eq("email", email);
      console.log(`[ensure-primary-admin] demoted profile email ${email} (no auth user found)`);
    }
  }

  // Ensure primary admin auth user (no duplicate)
  let adminUser = await findAuthUserByEmail(supabase, PRIMARY.email);
  const password = process.env.PRIMARY_ADMIN_PASSWORD?.trim();

  if (!adminUser) {
    const createPayload = {
      email: PRIMARY.email,
      email_confirm: true,
      user_metadata: {
        full_name: PRIMARY.fullName,
        role: "admin",
        mobile: PRIMARY.mobile,
      },
      app_metadata: { role: "admin" },
    };
    if (password) {
      createPayload.password = password;
    }
    const { data, error } = await supabase.auth.admin.createUser(createPayload);
    if (error || !data.user) {
      throw new Error(`createUser failed: ${error?.message ?? "unknown"}`);
    }
    adminUser = data.user;
    console.log("[ensure-primary-admin] created auth user", adminUser.id);
  } else {
    const updates = {
      email: PRIMARY.email,
      email_confirm: true,
      user_metadata: {
        ...(adminUser.user_metadata ?? {}),
        full_name: PRIMARY.fullName,
        role: "admin",
        mobile: PRIMARY.mobile,
      },
      app_metadata: { ...(adminUser.app_metadata ?? {}), role: "admin" },
    };
    if (password) updates.password = password;
    const { error } = await supabase.auth.admin.updateUserById(adminUser.id, updates);
    if (error) throw new Error(`updateUser failed: ${error.message}`);
    console.log("[ensure-primary-admin] updated auth user", adminUser.id);
  }

  // Upsert profile (same id as auth user — no duplicate identity)
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: adminUser.id,
      role: "admin",
      full_name: PRIMARY.fullName,
      email: PRIMARY.email,
      mobile: PRIMARY.mobile,
      phone: PRIMARY.mobile,
      active: true,
      is_active: true,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    console.warn("[ensure-primary-admin] profile upsert warning:", profileError.message);
    await supabase
      .from("profiles")
      .update({
        role: "admin",
        full_name: PRIMARY.fullName,
        email: PRIMARY.email,
        mobile: PRIMARY.mobile,
        active: true,
        is_active: true,
      })
      .eq("id", adminUser.id);
  }

  // Ensure single customers row for mobile PIN (preserve wallet / apps)
  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id, mobile, hashed_pin, wallet_balance, name, email")
    .in("mobile", [PRIMARY.mobile, `91${PRIMARY.mobile}`, `+91${PRIMARY.mobile}`]);

  const pin = process.env.PRIMARY_ADMIN_PIN?.trim();
  let hashedPin = null;
  if (pin) {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error("PRIMARY_ADMIN_PIN must be exactly 6 digits");
    }
    hashedPin = await argon2.hash(pin, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  if ((existingCustomers ?? []).length > 1) {
    console.warn(
      "[ensure-primary-admin] multiple customers share admin mobile — leaving all rows intact; resolve manually",
    );
  } else if ((existingCustomers ?? []).length === 1) {
    const row = existingCustomers[0];
    const patch = {
      mobile: PRIMARY.mobile,
      name: row.name || PRIMARY.fullName,
      email: row.email || PRIMARY.email,
      is_active: true,
    };
    if (hashedPin) patch.hashed_pin = hashedPin;
    await supabase.from("customers").update(patch).eq("id", row.id);
    console.log("[ensure-primary-admin] linked existing customer", row.id, "wallet preserved");
  } else {
    const insert = {
      mobile: PRIMARY.mobile,
      name: PRIMARY.fullName,
      email: PRIMARY.email,
      is_active: true,
    };
    if (hashedPin) insert.hashed_pin = hashedPin;
    const { error: insertError } = await supabase.from("customers").insert(insert);
    if (insertError) {
      console.warn("[ensure-primary-admin] customers insert skipped:", insertError.message);
    } else {
      console.log("[ensure-primary-admin] created customers row for admin mobile");
    }
  }

  console.log("[ensure-primary-admin] done. Primary admin:", PRIMARY.email, PRIMARY.mobile);
}

main().catch((error) => {
  console.error("[ensure-primary-admin] failed:", error);
  process.exit(1);
});
