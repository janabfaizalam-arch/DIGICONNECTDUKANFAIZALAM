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

const { data, error } = await sb
  .from("customers")
  .select("id, mobile, name, hashed_pin, is_active")
  .is("hashed_pin", null)
  .limit(3);
console.log(JSON.stringify({ nullPinError: error?.message || null, nullPinRows: data?.length ?? 0 }, null, 2));

const { data: d2, error: e2 } = await sb.from("customers").select("id, mobile, name, hashed_pin, is_active").limit(3);
console.log(
  JSON.stringify(
    {
      sampleError: e2?.message || null,
      sample: (d2 || []).map((r) => ({
        id: r.id,
        mobile: String(r.mobile || "").slice(0, 2) + "******",
        hasPin: Boolean(r.hashed_pin),
        name: Boolean(r.name),
        is_active: r.is_active,
      })),
    },
    null,
    2,
  ),
);

// Probe insert without pin (dry - roll back by delete if succeeds with temp mobile)
const probeMobile = "6000000001";
const { data: existing } = await sb.from("customers").select("id").eq("mobile", probeMobile).maybeSingle();
if (existing) {
  console.log(JSON.stringify({ probe: "already_exists" }));
} else {
  const { data: inserted, error: insErr } = await sb
    .from("customers")
    .insert({ mobile: probeMobile, name: "PROBE_DELETE_ME", is_active: true })
    .select("id, hashed_pin")
    .maybeSingle();
  console.log(
    JSON.stringify(
      {
        insertWithoutPin: insErr
          ? { ok: false, message: insErr.message, code: insErr.code }
          : { ok: true, id: inserted?.id, hasPin: Boolean(inserted?.hashed_pin) },
      },
      null,
      2,
    ),
  );
  if (inserted?.id) {
    await sb.from("customers").delete().eq("id", inserted.id);
    console.log(JSON.stringify({ probeCleanup: "deleted" }));
  }
}
