import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

function mask(v) {
  const d = String(v || "").replace(/\D/g, "");
  const l = d.slice(-10);
  return l ? `${l.slice(0, 2)}******${l.slice(-2)}` : null;
}

function norm(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : null;
}

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const local = process.argv[2] || "9455062648";
const variants = [local, `91${local}`, `+91${local}`, `0${local}`, `+91 ${local}`, `+91-${local}`];

const out = { localMasked: mask(local), variants };

const customersSelectAttempts = [
  "id, user_id, mobile, full_name, email, is_active, hashed_pin, created_at",
  "id, user_id, mobile, name, email, is_active, hashed_pin, created_at",
  "id, user_id, mobile, email, is_active, created_at",
  "id, mobile, created_at",
];

let customers = null;
let customersErr = null;
for (const sel of customersSelectAttempts) {
  const res = await sb.from("customers").select(sel).in("mobile", variants);
  if (!res.error) {
    customers = res.data;
    out.customersSelect = sel;
    break;
  }
  customersErr = { message: res.error.message, code: res.error.code };
}
out.customersErr = customers ? null : customersErr;
out.customers = (customers || []).map((r) => ({
  id: r.id,
  user_id: r.user_id ?? null,
  mobile: mask(r.mobile),
  mobileRaw: String(r.mobile || ""),
  hasName: Boolean(r.full_name || r.name),
  email: r.email ? "set" : "",
  is_active: r.is_active ?? null,
  hasPin: Boolean(r.hashed_pin),
  created_at: r.created_at,
}));

const { data: p1, error: ep1 } = await sb
  .from("profiles")
  .select("id, role, phone, mobile, email, full_name, active, is_active, account_status")
  .in("phone", variants);
const { data: p2, error: ep2 } = await sb
  .from("profiles")
  .select("id, role, phone, mobile, email, full_name, active, is_active, account_status")
  .in("mobile", variants);
out.profilesErr = { phone: ep1?.message || null, mobile: ep2?.message || null };
const pmap = new Map();
for (const r of [...(p1 || []), ...(p2 || [])]) pmap.set(r.id, r);
out.profiles = [...pmap.values()].map((r) => ({
  id: r.id,
  role: r.role,
  phone: mask(r.phone),
  phoneRaw: String(r.phone || ""),
  mobile: mask(r.mobile),
  mobileRaw: String(r.mobile || ""),
  email: r.email ? (String(r.email).includes("@customer.") ? "internal" : "set") : "",
  hasName: Boolean(r.full_name),
  active: r.active,
  is_active: r.is_active,
  account_status: r.account_status,
}));

const profileIds = out.profiles.map((p) => p.id);
if (profileIds.length) {
  for (const sel of customersSelectAttempts) {
    const res = await sb.from("customers").select(sel).in("user_id", profileIds);
    if (!res.error) {
      out.customersByUser = (res.data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        mobile: mask(r.mobile),
        mobileRaw: String(r.mobile || ""),
        hasPin: Boolean(r.hashed_pin),
        is_active: r.is_active ?? null,
      }));
      break;
    }
    out.customersByUserErr = res.error.message;
  }
}

const { data: apps } = await sb
  .from("applications")
  .select("id, user_id, customer_id, customer_mobile, status, payment_status, created_at")
  .or(`customer_mobile.eq.${local},customer_mobile.eq.+91${local},customer_mobile.eq.91${local}`)
  .limit(20);
out.apps = (apps || []).map((a) => ({
  id: a.id,
  user_id: a.user_id,
  customer_id: a.customer_id,
  mobile: mask(a.customer_mobile),
  status: a.status,
  payment_status: a.payment_status,
}));

// Fuzzy: customers where normalized mobile might differ — scan recent / ilike last 4
const { data: fuzzy } = await sb
  .from("customers")
  .select("id, user_id, mobile")
  .ilike("mobile", `%${local.slice(-4)}`)
  .limit(30);
out.fuzzyCustomers = (fuzzy || [])
  .filter((r) => norm(r.mobile) === local)
  .map((r) => ({ id: r.id, user_id: r.user_id, mobileRaw: String(r.mobile || ""), mobile: mask(r.mobile) }));

try {
  const matched = [];
  for (let page = 1; page <= 5; page++) {
    const { data: authList, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      out.authUsersErr = error.message;
      break;
    }
    for (const u of authList?.users || []) {
      const phones = [u.phone, u.user_metadata?.phone, u.user_metadata?.mobile].map(norm);
      const emailHit = String(u.email || "").includes(local);
      if (phones.includes(local) || emailHit) {
        matched.push({
          id: u.id,
          phone: mask(u.phone),
          email: u.email
            ? String(u.email).includes("@customer.")
              ? "internal"
              : "set"
            : "",
          role: u.app_metadata?.role || u.user_metadata?.role || null,
          created_at: u.created_at,
        });
      }
    }
    if ((authList?.users || []).length < 1000) break;
  }
  out.authUsers = matched;
} catch (e) {
  out.authUsersErr = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(out, null, 2));
