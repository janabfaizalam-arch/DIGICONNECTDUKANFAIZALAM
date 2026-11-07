import { FEATURE_GROUPS, type DigitalPlan, type FeatureGroup } from "./types";

export type ComparisonCell = { included: false } | { included: true; value: string | null };

export type ComparisonRow = { key: string; label: string; cells: ComparisonCell[] };

export type ComparisonGroup = { id: FeatureGroup; label: string; rows: ComparisonRow[] };

/**
 * The comparison table, built from the plans' own feature rows.
 *
 * A row is a feature key; a plan either has it (with its own short value,
 * "Up to 10" or "Advanced") or it does not. Rows appear in the order they are
 * first met walking the plans from cheapest to most complete, so the table
 * reads as features being added. Nothing is inferred: a plan without a row
 * shows a dash, so the table can never claim more than the plan does.
 */
export function buildComparison(plans: Pick<DigitalPlan, "features">[]): ComparisonGroup[] {
  const order: string[] = [];
  const meta = new Map<string, { label: string; group: FeatureGroup }>();

  for (const plan of plans) {
    for (const feature of plan.features) {
      if (!meta.has(feature.key)) {
        meta.set(feature.key, { label: feature.compareLabel, group: feature.group });
        order.push(feature.key);
      }
    }
  }

  return FEATURE_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    rows: order
      .filter((key) => meta.get(key)!.group === group.id)
      .map((key) => ({
        key,
        label: meta.get(key)!.label,
        cells: plans.map((plan): ComparisonCell => {
          const feature = plan.features.find((item) => item.key === key);
          return feature ? { included: true, value: feature.value } : { included: false };
        }),
      })),
  })).filter((group) => group.rows.length > 0);
}
