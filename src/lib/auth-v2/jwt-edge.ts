/**
 * Edge-compatible HS256 JWT verification (Web Crypto only).
 *
 * Runtime boundary:
 * - This module is safe for Next.js Middleware (Edge Runtime).
 * - It does NOT import `jose`, so CompressionStream / Node zlib code never
 *   enters the Edge bundle.
 * - Signing and Node-only session logic stay in `jwt.ts` / `session.ts`
 *   (Node/server route handlers only).
 *
 * Verification rules match `jwt.ts`: HS256, issuer digiconnect, audience customer.
 */

export interface EdgeCustomerJWTPayload {
  sub: string;
  mobile: string;
  role: "customer";
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

function getSecretKey(): ArrayBuffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing.");
  }
  // Fresh ArrayBuffer avoids BufferSource typing mismatches under TS 5.9+.
  const encoded = new TextEncoder().encode(secret);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify a customer access token using Web Crypto HMAC-SHA256.
 * Returns null for any invalid / expired / wrong-issuer token.
 */
export async function verifyAccessTokenEdge(token: string): Promise<EdgeCustomerJWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerJson = new TextDecoder().decode(base64UrlToBytes(headerB64));
    const header = JSON.parse(headerJson) as { alg?: string; typ?: string };

    if (header.alg !== "HS256") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      getSecretKey(),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const expectedSig = bytesToBase64Url(await crypto.subtle.sign("HMAC", key, data));

    if (!timingSafeEqual(expectedSig, signatureB64)) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as EdgeCustomerJWTPayload;

    if (payload.iss !== "digiconnect") return null;

    const audience = payload.aud;
    const audOk = audience === "customer" || (Array.isArray(audience) && audience.includes("customer"));
    if (!audOk) return null;

    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    if (payload.role !== "customer" || !payload.sub || !payload.mobile) return null;

    return payload;
  } catch {
    return null;
  }
}
