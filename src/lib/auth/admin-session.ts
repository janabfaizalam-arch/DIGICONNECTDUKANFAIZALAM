import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

import { PRIMARY_ADMIN } from "@/lib/auth/primary-admin";

export const ADMIN_ACCESS_TOKEN_COOKIE = "v2_admin_access_token";

function getSecretKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing.");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export interface AdminJWTPayload extends JWTPayload {
  sub: string;
  email: string;
  mobile: string;
  role: "admin";
  full_name?: string;
}

export async function signAdminAccessToken(
  payload: Omit<AdminJWTPayload, "iat" | "exp" | "jti" | "iss" | "aud">,
) {
  return new SignJWT({ ...payload, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("digiconnect")
    .setAudience("admin")
    .setJti(globalThis.crypto.randomUUID())
    .setExpirationTime("8h")
    .sign(getSecretKey());
}

export async function verifyAdminAccessToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: "digiconnect",
      audience: "admin",
    });
    if (payload.role !== "admin") return null;
    return payload as AdminJWTPayload;
  } catch {
    return null;
  }
}

export async function setAdminAuthCookie(accessToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function clearAdminAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ACCESS_TOKEN_COOKIE);
}

export async function createPrimaryAdminPinSession(input: {
  userId: string;
  email: string;
  mobile: string;
  fullName?: string;
}) {
  const token = await signAdminAccessToken({
    sub: input.userId,
    email: input.email,
    mobile: input.mobile,
    role: "admin",
    full_name: input.fullName ?? PRIMARY_ADMIN.fullName,
  });
  await setAdminAuthCookie(token);
  return { ok: true as const };
}
