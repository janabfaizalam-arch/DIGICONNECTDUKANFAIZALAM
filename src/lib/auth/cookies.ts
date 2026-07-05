import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "customer_access_token";
const REFRESH_TOKEN_COOKIE = "customer_refresh_token";
const DEVICE_ID_COOKIE = "customer_device_id";

export async function setAuthCookies(accessToken: string, refreshToken: string, deviceId: string) {
  const cookieStore = await cookies();

  // 15 minutes
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  // 30 days
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // 10 years (persistent device tracking)
  cookieStore.set(DEVICE_ID_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  
  // We don't delete DEVICE_ID_COOKIE because we want to track this device even after logout
  // unless explicitly requested to forget device.
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function getDeviceId() {
  const cookieStore = await cookies();
  return cookieStore.get(DEVICE_ID_COOKIE)?.value;
}

export async function generateNewDeviceId() {
  // Simple UUID generator for device ID if crypto.randomUUID is available
  return crypto.randomUUID();
}
