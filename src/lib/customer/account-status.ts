/**
 * What the account badge is allowed to say.
 *
 * The dashboard used to render a green "Verified" pill next to every
 * customer's name, unconditionally — it was markup, not a fact. A customer who
 * had confirmed nothing and one who had confirmed everything saw the same
 * badge. That is the same class of claim as a star rating nobody left: free to
 * print, and untrue.
 *
 * The obvious fix — drive the badge from Supabase's `email_confirmed_at` — is
 * also wrong here, and it is worth writing down why. Customer email
 * verification has been retired in this codebase: `/api/auth/resend-verification`
 * answers 410 "Email verification removed for customers", and whether
 * `email_confirmed_at` is set at all now depends on a Supabase project setting
 * rather than on anything the customer did. A badge reading "Email not
 * verified" would therefore be alarming *and* useless — it would point at a
 * problem with no button to fix it.
 *
 * So the badge reports the one thing that is both true and actionable: how
 * much of the profile is filled in. Incomplete profiles are why our team has
 * to chase customers for the same address on every application, so it is also
 * the thing worth nudging.
 *
 * `emailOnFile` and `mobileOnFile` are recorded as plain facts — an address is
 * saved, a number is saved. Neither is verification, and neither may be
 * relabelled as verification without a confirmation flow actually existing
 * behind it.
 */

export type CustomerAccountStatus = {
  emailOnFile: boolean;
  mobileOnFile: boolean;
  profileComplete: boolean;
  completionPercent: number;
  /** The one line shown beneath the customer's name. */
  badge: {
    label: string;
    tone: "complete" | "partial" | "empty";
  };
};

export type AccountStatusInput = {
  email?: string | null;
  mobile?: string | null;
  completionPercent?: number;
};

/** A ten-digit Indian mobile, the shape the profile form enforces. */
export function hasIndianMobile(value: string | null | undefined): boolean {
  return /^[6-9]\d{9}$/.test(String(value ?? "").trim());
}

export function getCustomerAccountStatus(input: AccountStatusInput): CustomerAccountStatus {
  const emailOnFile = String(input.email ?? "").trim().length > 0;
  const mobileOnFile = hasIndianMobile(input.mobile);

  // `Math.min`/`Math.max` propagate NaN rather than clamping it, so a bad
  // value would reach the badge and print "Profile NaN% complete".
  const raw = Number(input.completionPercent);
  const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
  const profileComplete = percent >= 100;

  const badge = profileComplete
    ? { label: "Profile complete", tone: "complete" as const }
    : percent > 0
      ? { label: `Profile ${percent}% complete`, tone: "partial" as const }
      : { label: "Add your details", tone: "empty" as const };

  return { emailOnFile, mobileOnFile, profileComplete, completionPercent: percent, badge };
}
