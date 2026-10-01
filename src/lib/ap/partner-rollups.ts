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
};

export const EMPTY_PARTNER_ROLLUP: PartnerRollup = {
  totalApplications: 0,
  pendingApplications: 0,
  completedApplications: 0,
  pendingCommission: 0,
  totalPaidCommission: 0,
};

function blankRollup(): PartnerRollup {
  return { ...EMPTY_PARTNER_ROLLUP };
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

  for (const application of applications) {
    const rollup = forPartner(application.agency_partner_id);
    if (!rollup) continue;

    const status = String(application.status ?? "").toLowerCase();
    rollup.totalApplications += 1;
    if (status === "completed") rollup.completedApplications += 1;
    if (!OPEN_APPLICATION_STATUSES_EXCLUDED.includes(status)) rollup.pendingApplications += 1;
  }

  for (const commission of commissions) {
    const rollup = forPartner(commission.agency_partner_id);
    if (!rollup) continue;

    const status = String(commission.status ?? "").toLowerCase();
    const amount = toAmount(commission.calculated_amount);
    if (PENDING_COMMISSION_STATUSES.includes(status)) rollup.pendingCommission += amount;
    if (status === "paid") rollup.totalPaidCommission += amount;
  }

  return rollups;
}

/** The rollup for one partner, or zeroes — never undefined at the call site. */
export function rollupFor(
  rollups: Map<string, PartnerRollup>,
  partnerId: string,
): PartnerRollup {
  return rollups.get(partnerId) ?? EMPTY_PARTNER_ROLLUP;
}
