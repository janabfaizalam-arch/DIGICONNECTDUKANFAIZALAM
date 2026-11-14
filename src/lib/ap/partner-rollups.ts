/**
 * Per-partner rollups for the admin DC Partner list.
 *
 * Pulled out of `getAdminAgencyPartnerList` for two reasons.
 *
 * ── It was quadratic ──────────────────────────────────────────────────────
 * The list ran `applications.filter(...)` and `commissions.filter(...)` once
 * per partner, so the work was partners × applications. At 38 partners that is
 * invisible; at 500 partners and 50,000 applications it is ~25 million array
 * operations per page load. Indexing once and reading the index is O(A + C).
 *
 * ── It was also wrong ─────────────────────────────────────────────────────
 * PostgREST caps an unbounded select at `db.max_rows` (1000 by default), and
 * the two source queries had no range. Past a thousand applications the array
 * was silently truncated, so every partner's totals were understated with no
 * error anywhere. The caller now pages through the full set; this module is
 * the pure part, so the counting rules are testable without a database.
 */

import { applyLedgerEntry } from "@/lib/ap-wallet";

/**
 * Numeric coercion matching `ap-data.ts`'s private helper exactly, so moving
 * the arithmetic here cannot change a single rupee. `admin-format`'s
 * `safeNumber` is a different function — it returns a formatted string.
 */
function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** Statuses that still count as work in flight. */
const OPEN_APPLICATION_STATUSES_EXCLUDED = ["completed", "rejected", "cancelled"];

/** Commission states that are owed but not yet paid out. */
const PENDING_COMMISSION_STATUSES = ["pending", "earned", "approved"];

export type PartnerApplicationRow = {
  id: string;
  agency_partner_id: string | null;
  status: string | null;
  /** Optional: needed for "last worked on" and the service breakdown. */
  created_at?: string | null;
  service_name?: string | null;
  wallet_amount?: number | string | null;
};

/** A wallet ledger row, as the balance fold wants it. */
export type PartnerLedgerRow = {
  agency_partner_id: string | null;
  amount: number | string | null;
  entry_type: string | null;
};

/** One service and how many times this partner has applied for it. */
export type PartnerServiceUse = {
  name: string;
  count: number;
};

export type PartnerCommissionRow = {
  agency_partner_id: string | null;
  calculated_amount: number | null;
  status: string | null;
};

export type PartnerRollup = {
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  pendingCommission: number;
  totalPaidCommission: number;

  /** Spendable wallet money, folded from the ledger by the canonical rule. */
  walletBalance: number;
  /** What the wallet has already paid towards applications. */
  walletSpent: number;

  /** The most recent application, and what it was for. */
  lastApplicationAt: string | null;
  lastServiceName: string | null;

  /** Every service this partner has used, most-used first. */
  servicesUsed: PartnerServiceUse[];
};

export const EMPTY_PARTNER_ROLLUP: PartnerRollup = {
  totalApplications: 0,
  pendingApplications: 0,
  completedApplications: 0,
  pendingCommission: 0,
  totalPaidCommission: 0,
  walletBalance: 0,
  walletSpent: 0,
  lastApplicationAt: null,
  lastServiceName: null,
  servicesUsed: [],
};

/*
  A fresh object every time, and a fresh array with it. Sharing the constant's
  `servicesUsed` array between partners would have every partner's services
  pushed onto the same list.
*/
function blankRollup(): PartnerRollup {
  return { ...EMPTY_PARTNER_ROLLUP, servicesUsed: [] };
}

/** Later of two timestamps; either may be missing. */
function laterOf(current: string | null, candidate: string | null | undefined): string | null {
  const next = String(candidate ?? "").trim();
  if (!next) return current;
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

/**
 * Index applications and commissions by partner in a single pass each.
 *
 * Rows with no partner are skipped rather than bucketed under a falsy key:
 * `applications.agency_partner_id` is nullable, and a null key would collect
 * every unassigned application into one phantom partner.
 */
export function buildPartnerRollups(
  applications: PartnerApplicationRow[],
  commissions: PartnerCommissionRow[],
  ledger: PartnerLedgerRow[] = [],
): Map<string, PartnerRollup> {
  const rollups = new Map<string, PartnerRollup>();

  const forPartner = (partnerId: string | null | undefined) => {
    const id = String(partnerId ?? "").trim();
    if (!id) return null;
    let rollup = rollups.get(id);
    if (!rollup) {
      rollup = blankRollup();
      rollups.set(id, rollup);
    }
    return rollup;
  };

  /*
    Service counts are accumulated in a Map per partner and flattened at the
    end. Pushing onto an array and de-duplicating later would be quadratic in
    the number of applications a partner has, which is the bug this module
    exists to have fixed once.
  */
  const serviceCounts = new Map<string, Map<string, number>>();

  for (const application of applications) {
    const partnerId = String(application.agency_partner_id ?? "").trim();
    const rollup = forPartner(application.agency_partner_id);
    if (!rollup) continue;

    const status = String(application.status ?? "").toLowerCase();
    rollup.totalApplications += 1;
    if (status === "completed") rollup.completedApplications += 1;
    if (!OPEN_APPLICATION_STATUSES_EXCLUDED.includes(status)) rollup.pendingApplications += 1;

    rollup.walletSpent += toAmount(application.wallet_amount);

    // "Last worked on" is the newest application, whatever order the rows arrive in.
    const previousLatest = rollup.lastApplicationAt;
    rollup.lastApplicationAt = laterOf(previousLatest, application.created_at);
    if (rollup.lastApplicationAt !== previousLatest) {
      rollup.lastServiceName = String(application.service_name ?? "").trim() || null;
    }

    const serviceName = String(application.service_name ?? "").trim();
    if (serviceName) {
      let counts = serviceCounts.get(partnerId);
      if (!counts) {
        counts = new Map<string, number>();
        serviceCounts.set(partnerId, counts);
      }
      counts.set(serviceName, (counts.get(serviceName) ?? 0) + 1);
    }
  }

  for (const commission of commissions) {
    const rollup = forPartner(commission.agency_partner_id);
    if (!rollup) continue;

    const status = String(commission.status ?? "").toLowerCase();
    const amount = toAmount(commission.calculated_amount);
    if (PENDING_COMMISSION_STATUSES.includes(status)) rollup.pendingCommission += amount;
    if (status === "paid") rollup.totalPaidCommission += amount;
  }

  /*
    The wallet balance is folded with `applyLedgerEntry`, the same function
    every other balance in the product goes through. A second copy of "which
    entry types add and which subtract" is how a list ends up disagreeing with
    the partner's own wallet screen about what they have.
  */
  for (const entry of ledger) {
    const rollup = forPartner(entry.agency_partner_id);
    if (!rollup) continue;
    rollup.walletBalance = applyLedgerEntry(rollup.walletBalance, {
      amount: entry.amount,
      entry_type: String(entry.entry_type ?? ""),
    });
  }

  // Most-used service first, then alphabetical so the order is stable.
  for (const [partnerId, counts] of serviceCounts) {
    const rollup = rollups.get(partnerId);
    if (!rollup) continue;
    rollup.servicesUsed = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  return rollups;
}

/** e.g. "ITR Filing x3, Driving Licence x1" — one cell a person can read. */
export function formatServicesUsed(services: PartnerServiceUse[], limit = 6): string {
  if (services.length === 0) return "";
  const shown = services.slice(0, limit).map((s) => `${s.name} x${s.count}`);
  const hidden = services.length - shown.length;
  return hidden > 0 ? `${shown.join(", ")} +${hidden} more` : shown.join(", ");
}

/** The rollup for one partner, or zeroes — never undefined at the call site. */
export function rollupFor(
  rollups: Map<string, PartnerRollup>,
  partnerId: string,
): PartnerRollup {
  return rollups.get(partnerId) ?? EMPTY_PARTNER_ROLLUP;
}
