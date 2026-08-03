import crypto from "crypto";

const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "121212",
  "112233",
  "123123",
  "101010",
  "010101",
]);

export function isValidPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function validateCustomerPin(pin: string, localPhone?: string): { ok: true } | { ok: false; error: string } {
  if (!isValidPinFormat(pin)) {
    return { ok: false, error: "PIN exactly 6 digits hona chahiye." };
  }

  if (WEAK_PINS.has(pin)) {
    return { ok: false, error: "Yeh PIN weak hai. Koi aur 6-digit PIN choose karein." };
  }

  if (localPhone && localPhone.length >= 6 && pin === localPhone.slice(-6)) {
    return { ok: false, error: "PIN mobile number ke last 6 digits nahi ho sakta." };
  }

  return { ok: true };
}

export function getAuthHmacSecret(): string {
  const secret = process.env.AUTH_HMAC_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_HMAC_SECRET must be set (min 32 characters).");
  }
  return secret;
}

/** HMAC_SHA256(SERVER_SECRET, normalizedPhone + ":" + pin) — used as Supabase Auth password. */
export function derivePinPassword(localPhone: string, pin: string): string {
  const secret = getAuthHmacSecret();
  return crypto.createHmac("sha256", secret).update(`${localPhone}:${pin}`).digest("hex");
}

export function hashOtp(otp: string): string {
  const secret = process.env.AUTH_HMAC_SECRET?.trim();
  if (!secret) {
    console.error("[auth] AUTH_HMAC_SECRET_missing_using_dev_fallback");
  } else if (secret.length < 32) {
    console.error("[auth] AUTH_HMAC_SECRET_too_short", { length: secret.length });
  }
  return crypto.createHmac("sha256", secret || "otp-fallback-dev-only").update(`otp:${otp}`).digest("hex");
}

export function verifyOtpHash(otp: string, otpHash: string): boolean {
  const a = Buffer.from(hashOtp(otp));
  const b = Buffer.from(otpHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
