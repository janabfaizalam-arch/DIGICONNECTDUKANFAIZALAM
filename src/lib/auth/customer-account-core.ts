/**
 * Pure validation for the email/password customer account system.
 *
 * Kept free of Supabase and I/O so the rules can be tested directly — these
 * decide who gets an account, so they are the part most worth pinning down.
 */

import { normalizeIndianPhone } from "@/lib/auth/phone";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt truncates beyond this

/** Deliberately small: these are the passwords attackers try first. */
const BANNED_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "abc12345",
  "iloveyou",
  "welcome1",
  "admin123",
  "india123",
  "digiconnect",
  "digiconnect1",
]);

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export function checkPasswordStrength(raw: unknown): PasswordCheck {
  const password = typeof raw === "string" ? raw : "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, error: "Password must include at least one letter." };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: "Password must include at least one number." };
  }
  if (BANNED_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: "That password is too common. Please choose a different one." };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, error: "Password cannot be a single repeated character." };
  }

  return { ok: true };
}

/**
 * Conservative email normalisation: lowercase and trim only.
 *
 * Deliberately does NOT strip dots or +tags — two people may legitimately own
 * addresses that a "canonicalising" rule would collapse into one account.
 */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

// Intentionally permissive; real validation is the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(raw: unknown): boolean {
  const email = normalizeEmail(raw);
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export type Identifier =
  | { kind: "email"; email: string }
  | { kind: "mobile"; mobile: string }
  | { kind: "invalid" };

/**
 * Work out whether a login identifier is an email or an Indian mobile number,
 * so one field can accept both.
 */
export function resolveIdentifier(raw: unknown): Identifier {
  const value = String(raw ?? "").trim();
  if (!value) return { kind: "invalid" };

  if (value.includes("@")) {
    return isValidEmail(value) ? { kind: "email", email: normalizeEmail(value) } : { kind: "invalid" };
  }

  const phone = normalizeIndianPhone(value);
  return phone.ok ? { kind: "mobile", mobile: phone.local } : { kind: "invalid" };
}

export type SignupInput = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  address: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
};

export type SignupValidation =
  | { ok: true; value: Omit<SignupInput, "confirmPassword"> }
  | { ok: false; field: keyof SignupInput; error: string };

/**
 * Validate a signup submission.
 *
 * Returns the first offending field so the UI can focus it, rather than a
 * single opaque "invalid details" string.
 */
export function validateSignup(input: Partial<SignupInput>): SignupValidation {
  const fullName = String(input.fullName ?? "").trim();
  if (fullName.length < 2 || fullName.length > 120) {
    return { ok: false, field: "fullName", error: "Please enter your full name." };
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, field: "email", error: "Please enter a valid email address." };
  }

  const phone = normalizeIndianPhone(String(input.mobile ?? ""));
  if (!phone.ok) {
    return { ok: false, field: "mobile", error: phone.error };
  }

  const password = String(input.password ?? "");
  const strength = checkPasswordStrength(password);
  if (!strength.ok) {
    return { ok: false, field: "password", error: strength.error };
  }
  if (password !== String(input.confirmPassword ?? "")) {
    return { ok: false, field: "confirmPassword", error: "Passwords do not match." };
  }

  const address = String(input.address ?? "").trim();
  if (address.length < 5 || address.length > 400) {
    return { ok: false, field: "address", error: "Please enter your full address." };
  }

  const pincode = String(input.pincode ?? "").trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { ok: false, field: "pincode", error: "Please enter a valid 6-digit pincode." };
  }

  const city = String(input.city ?? "").trim();
  if (city.length < 2 || city.length > 120) {
    return { ok: false, field: "city", error: "Please select your city or village." };
  }

  const district = String(input.district ?? "").trim();
  const state = String(input.state ?? "").trim();
  if (!district || !state) {
    return { ok: false, field: "pincode", error: "District and state could not be resolved from the pincode." };
  }

  return {
    ok: true,
    value: {
      fullName,
      email,
      mobile: phone.local,
      password,
      address,
      pincode,
      city,
      district,
      state,
    },
  };
}

/**
 * Map a Supabase auth error to something a customer can act on.
 *
 * Sign-in failures stay deliberately vague: distinguishing "no such account"
 * from "wrong password" tells an attacker which emails are registered.
 */
export function describeAuthError(raw: unknown): string {
  const message = String(
    (raw && typeof raw === "object" && "message" in raw ? (raw as { message?: unknown }).message : raw) ?? "",
  ).toLowerCase();

  if (message.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox for the confirmation link.";
  }
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "Email/mobile or password is incorrect.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (message.includes("weak password")) {
    return "That password is too weak. Use at least 8 characters with letters and numbers.";
  }

  return "Something went wrong. Please try again.";
}
