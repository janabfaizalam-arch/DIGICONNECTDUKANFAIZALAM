/**
 * The credentials a DC Partner starts with.
 *
 * A partner is given their account over the phone, by someone reading it out.
 * A twelve-character random string does not survive that call: it gets
 * misheard, written down wrong, and the partner rings back. So the account is
 * built out of the one thing they already know by heart — their mobile number.
 *
 * The username IS the mobile number. The password is the mobile number behind
 * a fixed prefix, because Supabase on this project requires a lowercase
 * letter, an uppercase letter, a digit and a symbol in every password — a bare
 * ten-digit number is refused outright by `auth.admin.createUser`, which is the
 * error that blocked partner approval for a whole afternoon. `Dc@` supplies the
 * three classes the number does not, and it is short enough to say once:
 * "Dc@ — capital D, small c, at-the-rate — phir aapka number".
 *
 * This is deliberately a password anyone who knows the partner's number can
 * guess. It is a starting password, not a secret: every account created with
 * it is flagged `must_change_password`, and the panel asks for a real one on
 * every sign-in until they set it.
 */

/** Supplies the character classes a phone number cannot: upper, lower, symbol. */
const PREFIX = "Dc@";

/** Indian mobile numbers are stored as the last ten digits everywhere else. */
function tenDigits(mobile: unknown): string | null {
  const digits = String(mobile ?? "").replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/**
 * The login username for a partner: their mobile number, nothing else.
 *
 * Returns null when the number is not a usable Indian mobile, so a caller
 * cannot quietly provision an account nobody can sign in to.
 */
export function defaultPartnerUsername(mobile: unknown): string | null {
  return tenDigits(mobile);
}

/**
 * The starting password for a partner.
 *
 * Null for an unusable number, for the same reason as above — and because a
 * password built from a half-empty string would be the same for every partner
 * whose number failed to parse.
 */
export function defaultPartnerPassword(mobile: unknown): string | null {
  const digits = tenDigits(mobile);
  return digits ? `${PREFIX}${digits}` : null;
}

/** What to tell the partner on the call, spelled out. */
export function describeDefaultCredentials(mobile: unknown): {
  username: string;
  password: string;
  spoken: string;
} | null {
  const username = defaultPartnerUsername(mobile);
  const password = defaultPartnerPassword(mobile);
  if (!username || !password) return null;

  return {
    username,
    password,
    spoken: `Username: ${username}. Password: capital D, small c, @, phir ${username}.`,
  };
}

/**
 * Whether a password is still the one we handed out.
 *
 * Used to tell a partner who has genuinely chosen their own password from one
 * who typed the default back in — the nag has to stop for the first and not
 * for the second. It compares what the partner just submitted; it never reads
 * a stored password, because there is nothing readable to compare against.
 */
export function isDefaultPartnerPassword(password: unknown, mobile: unknown): boolean {
  const expected = defaultPartnerPassword(mobile);
  return Boolean(expected) && String(password ?? "") === expected;
}
