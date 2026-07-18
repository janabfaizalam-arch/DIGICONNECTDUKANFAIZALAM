import { SignJWT, jwtVerify } from "jose";

// The signing secret must be a private, server-only value. Falling back to a
// public value (like the Supabase anon key) would let anyone forge tokens.
function getEncodedSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing. Customer authentication cannot run securely.");
  }
  return new TextEncoder().encode(secret);
}

export interface CustomerJWTPayload {
  sub: string; // customer_id
  mobile: string;
  role: "customer";
  device_id?: string;
}

export async function signAccessToken(payload: CustomerJWTPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 15; // 15 minutes

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setSubject(payload.sub)
    .sign(getEncodedSecret());
}

export async function signRefreshToken(payload: CustomerJWTPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 30; // 30 days

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setSubject(payload.sub)
    .sign(getEncodedSecret());
}

export async function verifyJWT(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret());
    return payload as unknown as CustomerJWTPayload;
  } catch {
    // Token is invalid or expired
    return null;
  }
}
