/**
 * The credentials a DC Partner starts with.
 *
 * A partner is given their account over the phone, by someone reading it out.
 * A twelve-character random string does not survive that call: it gets
 * misheard, written down wrong, and the partner rings back. So the username IS
 * the mobile number — the one thing they already know by heart — and the
 * password is one short fixed string every partner shares.
 *
 * `Dc@123` supplies the four character classes Supabase on this project
 * demands (lowercase, uppercase, digit, symbol); a bare number is refused
 * outright by `auth.admin.createUser`, which is the error that blocked partner
 * approval for a whole afternoon.
 *
 * ## What this costs, stated plainly
 *
 * This is one password, known to everyone, for every partner account. Anyone
 * who learns it and has a partner's mobile number can sign in as that partner
 * — and partners operate wallets and payouts. It was previously derived per
 * partner (`Dc@` plus their own number), which was also guessable but at least
 * did not open every account with one string.
 *
 * The only thing standing between that and a live account is
 * `must_change_password`, and that is a prompt rather than a wall: a partner
 * can answer "Baad mein" on every sign-in and keep working. So an account can
 * sit on this password indefinitely. That trade was made deliberately, for the
 * phone call — it is not an oversight, and it is why this comment is here.
 *
 * It is also six characters, which is below the eight the panel asks of a
 * partner choosing their own password. Those minimums were brought down to six
 * so the system does not hand out a password it would itself refuse.
 */

/**
 * The starting password every partner is given.
 *
 * Carries an uppercase letter, a lowercase letter, a symbol and digits,
 * because Supabase's policy on this project rejects a password missing any of
 * the four.
 *
 * Exported because the admin panel has to tell the admin what to read out.
 * It used to be written into that copy by hand, which went stale the moment
 * this value changed — the sweep button still promised `Dc@<number>` — and a
 * stale promise there is the wrong password read down the phone to every
 * partner. Anything that shows the password reads it from here.
 */
export const DEFAULT_PARTNER_PASSWORD = "Dc@123";

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
 * The value no longer depends on the number, but this still refuses an
 * unusable one. The username is the mobile number, so a partner without a
 * valid number has no way to sign in whatever their password is — and every
 * caller reads a null here as "do not provision this account". Dropping that
 * guard would create accounts that exist and cannot be reached.
 */
export function defaultPartnerPassword(mobile: unknown): string | null {
  return tenDigits(mobile) ? DEFAULT_PARTNER_PASSWORD : null;
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
    spoken: `Username: ${username}. Password: capital D, small c, @, phir one-two-three.`,
  };
}

/**
 * Whether a password is still the one we handed out.
 *
 * Used to tell a partner who has genuinely chosen their own password from one
 * who typed the default back in — the nag has to stop for the first and not
 * for the second. It compares what the partner just submitted; it never reads
 * a stored password, because there is nothing readable to compare against.
 *
 * `mobile` is still required: the default is only ever issued to a partner
 * whose number is usable, so a record without one was never given it.
 */
export function isDefaultPartnerPassword(password: unknown, mobile: unknown): boolean {
  const expected = defaultPartnerPassword(mobile);
  return Boolean(expected) && String(password ?? "") === expected;
}
