import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!JWT_SECRET) {
  throw new Error("Missing JWT configuration");
}
const ENCODED_SECRET = new TextEncoder().encode(JWT_SECRET);

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
    .sign(ENCODED_SECRET);
}

export async function signRefreshToken(payload: CustomerJWTPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 30; // 30 days

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setSubject(payload.sub)
    .sign(ENCODED_SECRET);
}

export async function verifyJWT(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ENCODED_SECRET);
    return payload as unknown as CustomerJWTPayload;
  } catch {
    // Token is invalid or expired
    return null;
  }
}
