/**
 * Shared validation for admin Digi Partner password resets.
 * Runs before any Supabase Admin Auth call.
 */

export const PARTNER_PASSWORD_MIN_LENGTH = 8;
export const PARTNER_PASSWORD_MAX_LENGTH = 128;

export type PartnerPasswordValidation =
  | { ok: true; password: string }
  | { ok: false; code: "too_short" | "too_long" | "mismatch" | "empty"; message: string };

export function validatePartnerPasswordInput(
  password: unknown,
  confirmPassword: unknown,
): PartnerPasswordValidation {
  const pwd = String(password ?? "");
  const confirm = String(confirmPassword ?? "");

  if (!pwd) {
    return { ok: false, code: "empty", message: "Enter a new password." };
  }
  if (pwd.length < PARTNER_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      code: "too_short",
      message: `Password must be at least ${PARTNER_PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (pwd.length > PARTNER_PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      code: "too_long",
      message: `Password must be at most ${PARTNER_PASSWORD_MAX_LENGTH} characters.`,
    };
  }
  if (pwd !== confirm) {
    return { ok: false, code: "mismatch", message: "Passwords do not match." };
  }

  return { ok: true, password: pwd };
}

/** Admin-safe error messages for partner password reset failures. */
export const PARTNER_PASSWORD_RESET_MESSAGES = {
  missing_user_id: "This partner account is not linked to a Supabase Auth user.",
  partner_not_found: "Partner record could not be located.",
  auth_user_missing: "No Supabase Auth user exists for this partner link.",
  service_unavailable: "Service role unavailable. Check SUPABASE_SERVICE_ROLE_KEY.",
  unauthorized: "Admin access required.",
  supabase_rejected: "Supabase rejected the password update.",
  success: "Password updated successfully.",
} as const;
