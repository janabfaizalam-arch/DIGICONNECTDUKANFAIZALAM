import fs from "node:fs";
import path from "node:path";

/** Load .env.local / .env into process.env without overwriting existing values. */
export function loadEnvFiles(cwd = process.cwd()) {
  for (const file of [".env.local", ".env"]) {
    const fullPath = path.resolve(cwd, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export function extractSupabaseProjectRef(url = process.env.NEXT_PUBLIC_SUPABASE_URL || "") {
  const match = String(url).match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

/**
 * Hard gate for staging-only destructive/schema/copy operations.
 *
 * Requires BOTH:
 *   SUPABASE_TARGET_ENV=staging
 *   ALLOWED_STAGING_SUPABASE_PROJECT_REF=<exact project ref>
 * and the connected URL ref must match the allowlist.
 *
 * Known production/linked refs abort unless explicitly allowlisted as staging
 * (they never should be).
 */
export function assertStagingEnvironment(options = {}) {
  const {
    allowlistEnv = "ALLOWED_STAGING_SUPABASE_PROJECT_REF",
    targetEnvKey = "SUPABASE_TARGET_ENV",
    requireExplicitStaging = true,
  } = options;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const ref = extractSupabaseProjectRef(url);
  const targetEnv = String(process.env[targetEnvKey] || "").trim().toLowerCase();
  const allowed = String(process.env[allowlistEnv] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const knownProductionHints = [
    // Linked workspace project historically used as live DigiConnect Dukan DB.
    "oqcudhmnsmqwlfzlrvfw",
  ];

  const errors = [];

  if (!url) errors.push("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL is missing.");
  if (!ref) errors.push(`Could not parse Supabase project ref from URL host.`);
  if (requireExplicitStaging && targetEnv !== "staging") {
    errors.push(
      `${targetEnvKey} must be exactly "staging" (got "${targetEnv || "(empty)"}").`,
    );
  }
  if (!allowed.length) {
    errors.push(
      `${allowlistEnv} is required (comma-separated staging project refs).`,
    );
  }
  if (ref && allowed.length && !allowed.includes(ref)) {
    errors.push(
      `Connected project ref "${ref}" is not in ${allowlistEnv}=[${allowed.join(", ")}].`,
    );
  }
  if (ref && knownProductionHints.includes(ref) && !allowed.includes(ref)) {
    errors.push(
      `Connected project ref "${ref}" matches a known production/linked project and is not allowlisted.`,
    );
  }
  if (ref && knownProductionHints.includes(ref) && targetEnv === "staging" && allowed.includes(ref)) {
    // Extra caution: allowlist + staging flag still warn when hitting known prod ref.
    errors.push(
      `Refusing to treat known production/linked project "${ref}" as staging even if allowlisted. Use a dedicated staging project.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    ref,
    urlHost: url ? (() => { try { return new URL(url).host; } catch { return null; } })() : null,
    targetEnv,
    allowed,
  };
}
