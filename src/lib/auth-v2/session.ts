import { cookies } from 'next/headers';
import crypto from 'crypto';
import { verifyAccessToken } from './jwt';

export const ACCESS_TOKEN_COOKIE = 'v2_customer_access_token';
export const REFRESH_TOKEN_COOKIE = 'v2_customer_refresh_token';
export const DEVICE_ID_COOKIE = 'v2_device_id';

export async function setAuthCookies(accessToken: string, refreshToken: string, deviceId?: string) {
  const cookieStore = await cookies();
  
  // Access Token - Short Lived (15 mins)
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60, 
  });

  // Refresh Token - Long Lived (7 days)
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/customer-auth/refresh', // Scoped strictly to refresh endpoint
    maxAge: 7 * 24 * 60 * 60,
  });

  // Device ID - Long Lived (1 year)
  if (deviceId) {
    cookieStore.set(DEVICE_ID_COOKIE, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Lax to allow top-level navigation from external links
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete({
    name: REFRESH_TOKEN_COOKIE,
    path: '/api/customer-auth/refresh'
  });
  // Note: we do not delete DEVICE_ID_COOKIE on logout, so we can track returning devices
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { payload };
}
