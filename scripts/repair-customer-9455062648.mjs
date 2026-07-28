import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as argon2 from "argon2";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1].trim()] = v;
  }
}

loadEnv();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const profileId = "8ddbc21c-8b48-4112-a517-073e359e0a33";
const mobile = "9455062648";
const variants = [mobile, `91${mobile}`, `+91${mobile}`, `0${mobile}`];

const { data: profile, error: pErr } = await sb
  .from("profiles")
  .select("id, role, full_name, email, phone, mobile")
  .eq("id", profileId)
  .maybeSingle();

if (pErr || !profile) {
  console.log(JSON.stringify({ ok: false, step: "profile", error: pErr?.message || "missing" }));
  process.exit(1);
}

if (String(profile.role).toLowerCase() !== "customer") {
  console.log(JSON.stringify({ ok: false, step: "role", role: profile.role }));
  process.exit(1);
}

const { data: existing } = await sb.from("customers").select("id, mobile").in("mobile", variants).limit(5);
if ((existing?.length || 0) > 1) {
  console.log(JSON.stringify({ ok: false, step: "ambiguous_customers", count: existing.length }));
  process.exit(1);
}
if (existing?.length === 1) {
  const id = existing[0].id;
  await sb
    .from("applications")
    .update({ customer_id: id })
    .eq("user_id", profileId)
    .in("customer_mobile", variants);
  console.log(JSON.stringify({ ok: true, step: "already_exists", customerId: id }));
  process.exit(0);
}

const { data: idTaken } = await sb.from("customers").select("id, mobile").eq("id", profileId).maybeSingle();
if (idTaken) {
  console.log(
    JSON.stringify({
      ok: false,
      step: "id_collision",
      mobile: String(idTaken.mobile || "").slice(0, 2) + "******",
    }),
  );
  process.exit(1);
}

const name = String(profile.full_name || "").trim() || "Customer";
const placeholder = await argon2.hash(`unset-${profileId}-${Date.now()}`, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
});

const { data: inserted, error: insErr } = await sb
  .from("customers")
  .insert({
    id: profileId,
    mobile,
    name,
    email: String(profile.email || ""),
    is_active: true,
    hashed_pin: placeholder,
  })
  .select("id, mobile, name, is_active")
  .maybeSingle();

if (insErr) {
  console.log(JSON.stringify({ ok: false, step: "insert", error: insErr.message, code: insErr.code }));
  process.exit(1);
}

const { error: appErr } = await sb
  .from("applications")
  .update({ customer_id: profileId })
  .eq("user_id", profileId)
  .in("customer_mobile", variants);

console.log(
  JSON.stringify({
    ok: true,
    step: "repaired",
    customerId: inserted?.id,
    mobileMasked: mobile.slice(0, 2) + "******" + mobile.slice(-2),
    appsRelinkError: appErr?.message || null,
    note: "Placeholder PIN hash set; customer must complete Forgot/Create PIN OTP to set real PIN.",
  }),
);
