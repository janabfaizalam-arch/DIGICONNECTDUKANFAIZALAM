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
 */

export type PartnerLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
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

export function isValidLoginEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  const userIds = new Set<string>();

  const { data: profileRows } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .in("role", ["agent", "agency_partner"])
    .limit(2);

  for (const row of profileRows ?? []) {
    const id = String(row?.id ?? "").trim();
    if (id) userIds.add(id);
  }

  // Admin-created partners keep the contact address on the partner row, while
  // their profile row can carry the internal address instead.
  const { data: partnerRows } = await client
    .from("agency_partners")
    .select("user_id")
    .eq("email", email)
    .limit(2);

  for (const row of partnerRows ?? []) {
    const id = String(row?.user_id ?? "").trim();
    if (id) userIds.add(id);
  }

  if (userIds.size !== 1) return null;

  const [userId] = [...userIds];
  const { data: authUser } = await client.auth.admin.getUserById(userId);
  const authEmail = String(authUser?.user?.email ?? "").trim().toLowerCase();

  return isValidLoginEmail(authEmail) ? authEmail : null;
}
