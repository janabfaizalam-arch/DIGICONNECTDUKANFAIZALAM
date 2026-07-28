import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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

const local = "9455062648";
const variants = [local, `91${local}`, `+91${local}`, `0${local}`];
const { data: customers, error } = await sb
  .from("customers")
  .select("id, mobile, name, is_active, hashed_pin")
  .in("mobile", variants);

console.log(
  JSON.stringify(
    {
      error: error?.message || null,
      count: customers?.length ?? 0,
      rows: (customers || []).map((r) => ({
        id: r.id,
        mobile: String(r.mobile),
        name: Boolean(r.name),
        is_active: r.is_active,
        hasPinHash: Boolean(r.hashed_pin),
      })),
    },
    null,
    2,
  ),
);
