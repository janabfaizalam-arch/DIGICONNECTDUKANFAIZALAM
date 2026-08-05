import { createHash, timingSafeEqual } from "crypto";

/** Compare secrets without leaking length via early return on Buffer timingSafeEqual throw. */
export function secretsEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

const MIN_CRON_SECRET_LENGTH = 16;

/**
 * Resolve outbox cron secret.
 * Prefer COMMS_CRON_SECRET when the env key is present (even if blank → reject; do not fall through).
 * Legacy fallback: CRON_SECRET only when COMMS_CRON_SECRET is unset.
 * No development default.
 */
export function resolveCommsCronSecret(env: NodeJS.ProcessEnv = process.env): {
  ok: true;
  secret: string;
  source: "COMMS_CRON_SECRET" | "CRON_SECRET";
} | { ok: false } {
  const preferredPresent = Object.prototype.hasOwnProperty.call(env, "COMMS_CRON_SECRET");
  if (preferredPresent) {
    const value = String(env.COMMS_CRON_SECRET ?? "").trim();
    if (value.length < MIN_CRON_SECRET_LENGTH) return { ok: false };
    return { ok: true, secret: value, source: "COMMS_CRON_SECRET" };
  }
  const legacy = String(env.CRON_SECRET ?? "").trim();
  if (legacy.length < MIN_CRON_SECRET_LENGTH) return { ok: false };
  return { ok: true, secret: legacy, source: "CRON_SECRET" };
}

export { MIN_CRON_SECRET_LENGTH };
