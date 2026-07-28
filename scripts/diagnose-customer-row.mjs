import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}

loadEnv();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const customerId = "161ae7b5-9138-4a45-b839-92476862c05f";
const profileId = "8ddbc21c-8b48-4112-a517-073e359e0a33";

const { data: star, error: starErr } = await sb.from("customers").select("*").eq("id", customerId).maybeSingle();
const safe = star
  ? Object.fromEntries(
      Object.entries(star).map(([k, v]) => {
        if (k.toLowerCase().includes("pin") || k.toLowerCase().includes("hash") || k.toLowerCase().includes("password")) {
          return [k, v ? "PRESENT" : null];
        }
        if (k === "mobile" || k === "phone") return [k, v];
        if (typeof v === "string" && v.includes("@")) return [k, "set"];
        return [k, v];
      }),
    )
  : null;

console.log(JSON.stringify({ starErr: starErr?.message || null, customer: safe, columns: star ? Object.keys(star) : [] }, null, 2));

// Probe columns
for (const col of ["user_id", "name", "full_name", "hashed_pin", "is_active", "email", "source", "pincode"]) {
  const { error } = await sb.from("customers").select(col).eq("id", customerId).maybeSingle();
  console.log(`col ${col}: ${error ? error.message : "ok"}`);
}

// Any other customers with this id linkage via applications
const { data: apps } = await sb
  .from("applications")
  .select("id, customer_id, user_id, customer_mobile, service_name, status")
  .eq("user_id", profileId)
  .limit(20);
console.log("apps_for_profile", JSON.stringify(apps, null, 2));

const { data: apps2 } = await sb
  .from("applications")
  .select("id, customer_id, user_id, customer_mobile")
  .eq("customer_id", customerId)
  .limit(20);
console.log("apps_for_customer", JSON.stringify(apps2, null, 2));
