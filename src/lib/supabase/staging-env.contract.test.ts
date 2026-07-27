import { describe, expect, it, beforeEach, afterEach } from "vitest";

function extractSupabaseProjectRef(url = "") {
  const match = String(url).match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function assertStagingEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
  const ref = extractSupabaseProjectRef(url);
  const targetEnv = String(env.SUPABASE_TARGET_ENV || "").trim().toLowerCase();
  const allowed = String(env.ALLOWED_STAGING_SUPABASE_PROJECT_REF || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const knownProductionHints = ["oqcudhmnsmqwlfzlrvfw"];
  const errors: string[] = [];

  if (!url) errors.push("missing url");
  if (!ref) errors.push("bad ref");
  if (targetEnv !== "staging") errors.push("not staging");
  if (!allowed.length) errors.push("no allowlist");
  if (ref && allowed.length && !allowed.includes(ref)) errors.push("ref not allowlisted");
  if (ref && knownProductionHints.includes(ref)) {
    errors.push("known production ref blocked");
  }

  return { ok: errors.length === 0, errors, ref };
}

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_TARGET_ENV",
  "ALLOWED_STAGING_SUPABASE_PROJECT_REF",
] as const;

describe("staging environment assertion", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) original[k] = process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  it("blocks linked production project ref even if mislabeled staging", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://oqcudhmnsmqwlfzlrvfw.supabase.co";
    process.env.SUPABASE_TARGET_ENV = "staging";
    process.env.ALLOWED_STAGING_SUPABASE_PROJECT_REF = "oqcudhmnsmqwlfzlrvfw";
    const result = assertStagingEnvironment(process.env);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /production/i.test(e))).toBe(true);
  });

  it("allows a dedicated staging ref when correctly configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijklmnop.supabase.co";
    process.env.SUPABASE_TARGET_ENV = "staging";
    process.env.ALLOWED_STAGING_SUPABASE_PROJECT_REF = "abcdefghijklmnop";
    const result = assertStagingEnvironment(process.env);
    expect(result.ok).toBe(true);
    expect(result.ref).toBe("abcdefghijklmnop");
  });

  it("defaults to fail closed without staging flags", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijklmnop.supabase.co";
    delete process.env.SUPABASE_TARGET_ENV;
    delete process.env.ALLOWED_STAGING_SUPABASE_PROJECT_REF;
    const result = assertStagingEnvironment(process.env);
    expect(result.ok).toBe(false);
  });
});
