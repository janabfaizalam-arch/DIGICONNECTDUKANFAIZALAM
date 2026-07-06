import { SignJWT, jwtVerify, JWTPayload } from 'jose';

function getSecretKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing. Customer Authentication V2 cannot start securely.");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export interface CustomerJWTPayload extends JWTPayload {
  sub: string; // customer id
  mobile: string;
  role: 'customer';
}

export async function signAccessToken(payload: Omit<CustomerJWTPayload, 'iat' | 'exp' | 'jti' | 'iss' | 'aud'>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('digiconnect')
    .setAudience('customer')
    .setJti(globalThis.crypto.randomUUID())
    .setExpirationTime('15m') // Short lived
    .sign(getSecretKey());
}

export async function verifyAccessToken(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: 'digiconnect',
      audience: 'customer',
    });
    return payload as CustomerJWTPayload;
  } catch {
    return null;
  }
}
