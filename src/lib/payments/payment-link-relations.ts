import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Attach a payment link's related rows by id, because PostgREST cannot embed
 * them.
 *
 * Every page that shows payment links used to ask for them the obvious way:
 *
 *   .from("payment_links")
 *   .select("*, applications(...), profiles(...), agency_partners(...)")
 *
 * and every one of those embeds is a trap in this schema:
 *
 *   profiles      - payment_links.customer_id references auth.users(id), not
 *                   public.profiles, so there is no relationship to walk.
 *   applications  - there are TWO foreign keys between these tables:
 *                     payment_links.application_id -> applications.id
 *                     applications.payment_link_id -> payment_links.id
 *                   PostgREST refuses an embed it cannot disambiguate.
 *
 * Neither failure is local. PostgREST rejects the *whole* query, so the caller
 * gets no rows at all and reports "no payment links" or "link not found" for
 * data that is sitting right there. That is precisely how a working customer
 * payment link came to say it did not exist.
 *
 * So the relations are fetched here, each by its own primary key, in one batch
 * per table. Nothing to resolve, nothing to disambiguate, and a future foreign
 * key cannot quietly take these pages down again. The rows come back shaped
 * exactly like the embeds they replace — `link.applications?.service_name`,
 * `link.profiles?.full_name` — so callers and their templates are unchanged.
 */

/** The columns every caller between them needs. Cheap enough to fetch always. */
const APPLICATION_COLUMNS = "id, service_name, status, service_slug, customer_details";
const PROFILE_COLUMNS = "id, full_name, mobile";
const PARTNER_COLUMNS = "id, full_name";

export type PaymentLinkApplication = {
  id: string;
  service_name: string | null;
  status: string | null;
  service_slug: string | null;
  customer_details: unknown;
};

export type PaymentLinkProfile = {
  id: string;
  full_name: string | null;
  mobile: string | null;
};

export type PaymentLinkPartner = {
  id: string;
  full_name: string | null;
};

type LinkRow = {
  application_id?: string | null;
  customer_id?: string | null;
  partner_id?: string | null;
};

export type WithPaymentLinkRelations<T> = T & {
  applications: PaymentLinkApplication | null;
  profiles: PaymentLinkProfile | null;
  agency_partners: PaymentLinkPartner | null;
};

function uniqueIds(rows: LinkRow[], key: keyof LinkRow): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value === "string" && value) ids.add(value);
  }
  return [...ids];
}

async function indexById<T extends { id: string }>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  ids: string[],
): Promise<Map<string, T>> {
  const index = new Map<string, T>();
  if (!ids.length) return index;

  const { data, error } = await supabase.from(table).select(columns).in("id", ids);

  if (error) {
    // A name is decoration; the amount, the code and the expiry are what the
    // customer pays against. Losing a label must not lose the link.
    console.error(`[payment-link-relations] Could not load ${table}:`, error);
    return index;
  }

  for (const row of (data as unknown as T[]) ?? []) {
    index.set(row.id, row);
  }
  return index;
}

/**
 * Hydrate payment link rows with their application, customer profile and
 * partner. Three queries regardless of how many links are passed.
 */
export async function attachPaymentLinkRelations<T extends LinkRow>(
  supabase: SupabaseClient,
  rows: T[] | null | undefined,
): Promise<WithPaymentLinkRelations<T>[]> {
  const links = rows ?? [];
  if (!links.length) return [];

  const [applications, profiles, partners] = await Promise.all([
    indexById<PaymentLinkApplication>(
      supabase,
      "applications",
      APPLICATION_COLUMNS,
      uniqueIds(links, "application_id"),
    ),
    indexById<PaymentLinkProfile>(
      supabase,
      "profiles",
      PROFILE_COLUMNS,
      uniqueIds(links, "customer_id"),
    ),
    indexById<PaymentLinkPartner>(
      supabase,
      "agency_partners",
      PARTNER_COLUMNS,
      uniqueIds(links, "partner_id"),
    ),
  ]);

  return links.map((link) => ({
    ...link,
    applications: (link.application_id && applications.get(link.application_id)) || null,
    profiles: (link.customer_id && profiles.get(link.customer_id)) || null,
    agency_partners: (link.partner_id && partners.get(link.partner_id)) || null,
  }));
}
