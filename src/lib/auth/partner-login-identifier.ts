/**
 * Turn whatever a DC Partner typed into the login box into the email address
 * their Supabase Auth user actually has.
 *
 * A partner's sign-in address is `<username>@agency.rnos.internal`, built by
 * `agencyInternalEmail` when the account is provisioned. Their real email is
 * contact detail on `profiles` / `agency_partners` — it is not a credential
 * and no Auth user exists at it. So a partner who typed the address the admin
 * screen displays for them was signed in against an Auth user that does not
 * exist, and was told their password was wrong.
 *
 * This resolves the contact address back to the Auth user so either one works.
 * It widens the lookup only: Supabase still checks the password against that
 * Auth user, so nothing here authorises anybody.
 *
 * The stored address is matched case-insensitively. `/api/admin/agency-partners/create`
 * writes `body.email` verbatim — no trim, no case fold — so a partner entered
 * as "Saloni@Gmail.com" sits in the table exactly like that, and an equality
 * match on the lower-cased address the partner types finds nothing.
 */

export type PartnerLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      ilike: (
        column: string,
        pattern: string,
      ) => {
        in: (
          column: string,
          values: string[],
        ) => {
          limit: (count: number) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
        limit: (count: number) => Promise<{ data: Record<string, unknown>[] | null }>;
      };
    };
  };
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{ data: { user: { email?: string | null } | null } }>;
    };
  };
};

/** Enough rows to notice an ambiguous address without reading the table. */
const CANDIDATE_LIMIT = 10;

export function isValidLoginEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * `_` and `%` are LIKE wildcards and both are legal in a local-part, so an
 * address containing one would otherwise match addresses that are not it.
 * Escaping them keeps `ilike` to a plain case-insensitive comparison; the
 * exact check below is what the result is actually decided on either way.
 */
function likePattern(email: string) {
  return email.replace(/([\\%_])/g, "\\$1");
}

function matchesExactly(row: Record<string, unknown>, email: string) {
  return String(row?.email ?? "").trim().toLowerCase() === email;
}

/**
 * The Auth address for a partner reachable at `contactEmail`, or null.
 *
 * Only partner roles are searched, and only an unambiguous single match is
 * accepted: a shared or duplicated address resolves to nothing rather than
 * pointing a sign-in at somebody else's account.
 */
export async function resolvePartnerContactEmailToAuthEmail(
  client: PartnerLookupClient,
  contactEmail: string,
): Promise<string | null> {
  const email = contactEmail.trim().toLowerCase();
  if (!isValidLoginEmail(email)) return null;

  const pattern = likePattern(email);
  const userIds = new Set<string>();

  const { data: profileRows } = await client
    .from("profiles")
    .select("id, email")
    .ilike("email", pattern)
    .in("role", ["agent", "agency_partner"])
    .limit(CANDIDATE_LIMIT);

  for (const row of profileRows ?? []) {
    if (!matchesExactly(row, email)) continue;
    const id = String(row?.id ?? "").trim();
    if (id) userIds.add(id);
  }

  // Admin-created partners keep the contact address on the partner row, while
  // their profile row can carry the internal address instead.
  const { data: partnerRows } = await client
    .from("agency_partners")
    .select("user_id, email")
    .ilike("email", pattern)
    .limit(CANDIDATE_LIMIT);

  for (const row of partnerRows ?? []) {
    if (!matchesExactly(row, email)) continue;
    const id = String(row?.user_id ?? "").trim();
    if (id) userIds.add(id);
  }

  if (userIds.size !== 1) return null;

  const [userId] = [...userIds];
  const { data: authUser } = await client.auth.admin.getUserById(userId);
  const authEmail = String(authUser?.user?.email ?? "").trim().toLowerCase();

  return isValidLoginEmail(authEmail) ? authEmail : null;
}
