/**
 * Canonical, enum-safe values for application payment preparation.
 *
 * `applications.source` is the Postgres enum `public.application_source`
 * with values ('online', 'offline', 'agent_pos') in production. Writing any
 * other value fails the whole insert with 22P02 and blocks payment.
 *
 * Channel semantics (who brought the application) belong in the TEXT columns:
 *   - applications.source_channel   ('direct','agency_partner','online','offline','referral')
 *   - applications.application_source ('partner_assisted','customer_self','referral', ...)
 */

export const APPLICATION_SOURCE_ENUM_VALUES = ["online", "offline", "agent_pos"] as const;
export type ApplicationSourceEnum = (typeof APPLICATION_SOURCE_ENUM_VALUES)[number];

export const SOURCE_CHANNEL_VALUES = ["direct", "agency_partner", "online", "offline", "referral"] as const;
export type SourceChannel = (typeof SOURCE_CHANNEL_VALUES)[number];

/** Enum-safe applications.source for a payment-preparation insert. */
export function resolveApplicationSourceEnum(isPartnerFlow: boolean): ApplicationSourceEnum {
  return isPartnerFlow ? "agent_pos" : "online";
}

/** Channel tracking that carries the real business meaning. */
export function resolveSourceChannel(options: { isPartnerFlow: boolean; isReferral?: boolean }): SourceChannel {
  if (options.isPartnerFlow) return "agency_partner";
  if (options.isReferral) return "referral";
  return "online";
}

/** Integer paise from a rupee amount; guards NaN/negatives. */
export function rupeesToPaise(rupees: number): number {
  const value = Number(rupees);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}
