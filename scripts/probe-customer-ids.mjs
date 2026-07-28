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

const profileId = "8ddbc21c-8b48-4112-a517-073e359e0a33";
const orphanId = "161ae7b5-9138-4a45-b839-92476862c05f";

for (const id of [profileId, orphanId]) {
  const { data, error } = await sb.from("customers").select("id, mobile").eq("id", id).maybeSingle();
  console.log(JSON.stringify({ id, exists: Boolean(data), mobile: data?.mobile || null, error: error?.message || null }));
}
