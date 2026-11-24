import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Proof that a file was uploaded through our own upload route, and what it
 * really is.
 *
 * The order used to be built from whatever the browser said: the storage path
 * (any object in the bucket, including another customer's), the page count
 * (a 100-page PDF declared as one page and charged ₹2), the size and type.
 * The upload route now signs what it measured itself, and an order can only
 * be created from that signature.
 */

export type UploadFacts = {
  path: string;
  pages: number;
  size: number;
  mime: string;
  name: string;
};

const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.PRINT_UPLOAD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  // Domain-separated, so this signature is never valid for anything else the
  // same key signs.
  return value ? `digi-print-upload:${value}` : "";
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function issueUploadReceipt(facts: UploadFacts, now = Date.now(), key = secret()): string | null {
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ ...facts, t: now })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function readUploadReceipt(
  receipt: unknown,
  now = Date.now(),
  key = secret(),
): UploadFacts | null {
  if (!key || typeof receipt !== "string" || receipt.length > 4096) return null;
  const [payload, signature, extra] = receipt.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadFacts & { t: number };
    if (!Number.isFinite(data.t) || now - data.t > MAX_AGE_MS || data.t - now > 60_000) return null;
    if (typeof data.path !== "string" || !data.path.startsWith("uploads/")) return null;
    return {
      path: data.path,
      pages: Math.max(1, Math.floor(Number(data.pages) || 1)),
      size: Math.max(0, Math.floor(Number(data.size) || 0)),
      mime: String(data.mime ?? ""),
      name: String(data.name ?? ""),
    };
  } catch {
    return null;
  }
}

/** A file name safe to put in a storage path: no slashes, no control characters. */
export function safeFileName(name: string): string {
  const base = String(name ?? "").split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(-120);
  return cleaned || "file";
}
