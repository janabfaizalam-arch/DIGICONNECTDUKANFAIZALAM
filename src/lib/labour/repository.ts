import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SEED_SCHEMES } from "@/lib/labour/seed-schemes";
import type { BenefitLine, LabourScheme, SchemeCategory } from "@/lib/labour/types";

/**
 * Where the scheme figures come from at request time.
 *
 * The database first, the seed file only when the table is empty or
 * unreachable. That ordering is the whole point of the CMS: an administrator
 * who reads a new notification changes an amount on a screen, and the page
 * changes — nobody edits TypeScript to correct a rupee figure, and no figure
 * is compiled into the bundle.
 *
 * A failure to read falls back rather than throwing. A Labour Card page that
 * shows the last known scheme list is more useful to somebody standing in a
 * shop than an error, and the verification badges already tell the reader how
 * fresh each figure is.
 */

type Row = {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  category: string;
  summary: string | null;
  beneficiaries: unknown;
  benefits: unknown;
  eligibility: unknown;
  key_conditions: unknown;
  documents: unknown;
  process: unknown;
  payment_method: string | null;
  warnings: unknown;
  verification_status: string;
  provided_by: string | null;
  verified_on: string | null;
  source_url: string | null;
  source_title: string | null;
  source_date: string | null;
  caveat: string | null;
  sort_order: number;
  published: boolean;
};

const COLUMNS =
  "id, slug, name, name_hi, category, summary, beneficiaries, benefits, eligibility, key_conditions, documents, process, payment_method, warnings, verification_status, provided_by, verified_on, source_url, source_title, source_date, caveat, sort_order, published";

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Benefit lines, defensively.
 *
 * A row typed by hand in an admin form can be missing a `kind`. Defaulting to
 * "cash" would be the dangerous choice — it is the one kind a reader treats as
 * money in hand — so anything unrecognised becomes a service line with its
 * text preserved and no rupee figure.
 */
function benefitList(value: unknown): BenefitLine[] {
  if (!Array.isArray(value)) return [];
  const kinds = new Set(["cash", "fd", "reimbursement", "installment", "pension", "service", "awareness"]);
  const frequencies = new Set(["one_time", "monthly", "annual", "per_event", "as_notified"]);

  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label : "";
    if (!label) return [];

    const kind = typeof item.kind === "string" && kinds.has(item.kind) ? item.kind : "service";
    const amount = typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : null;

    return [
      {
        label,
        kind,
        amount: kind === "service" && typeof item.kind !== "string" ? null : amount,
        amountNote: typeof item.amountNote === "string" ? item.amountNote : undefined,
        frequency:
          typeof item.frequency === "string" && frequencies.has(item.frequency)
            ? item.frequency
            : "as_notified",
        conditions: stringList(item.conditions),
      } as BenefitLine,
    ];
  });
}

function toScheme(row: Row): LabourScheme {
  const conditions = (row.key_conditions ?? {}) as Record<string, unknown>;
  const number = (key: string) =>
    typeof conditions[key] === "number" ? (conditions[key] as number) : undefined;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameHi: row.name_hi ?? undefined,
    category: row.category as SchemeCategory,
    summary: row.summary ?? "",
    beneficiaries: stringList(row.beneficiaries),
    benefits: benefitList(row.benefits),
    eligibility: stringList(row.eligibility),
    keyConditions: {
      membershipDays: number("membershipDays"),
      workDaysLast12Months: number("workDaysLast12Months"),
      childLimit: number("childLimit"),
      minAge: number("minAge"),
      maxAge: number("maxAge"),
      applicationWindow:
        typeof conditions.applicationWindow === "string" ? conditions.applicationWindow : undefined,
    },
    documents: stringList(row.documents),
    process: stringList(row.process),
    paymentMethod: row.payment_method ?? "",
    warnings: stringList(row.warnings),
    verification: {
      status: (row.verification_status as LabourScheme["verification"]["status"]) ?? "needs_review",
      providedBy: row.provided_by ?? "",
      verifiedOn: row.verified_on ?? "",
      sourceUrl: row.source_url,
      sourceTitle: row.source_title ?? "",
      sourceDate: row.source_date,
      caveat: row.caveat || undefined,
    },
    sortOrder: row.sort_order,
    published: row.published,
  };
}

export type SchemeSource = "database" | "seed";

export async function getLabourSchemes(): Promise<{ schemes: LabourScheme[]; source: SchemeSource }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { schemes: publishedSeed(), source: "seed" };

  const { data, error } = await supabase
    .from("labour_schemes")
    .select(COLUMNS)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return { schemes: publishedSeed(), source: "seed" };
  }
  return { schemes: (data as Row[]).map(toScheme), source: "database" };
}

/** Everything, drafts included. For the admin screen only. */
export async function getAllLabourSchemes(): Promise<{ schemes: LabourScheme[]; source: SchemeSource }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { schemes: SEED_SCHEMES, source: "seed" };

  const { data, error } = await supabase
    .from("labour_schemes")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return { schemes: SEED_SCHEMES, source: "seed" };
  return { schemes: (data as Row[]).map(toScheme), source: "database" };
}

function publishedSeed(): LabourScheme[] {
  return SEED_SCHEMES.filter((scheme) => scheme.published).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * How stale a figure is allowed to get before the panel asks for another look.
 *
 * Ninety days is a guess at a review rhythm, not a rule from anywhere — it
 * exists so that "nobody has checked this since March" becomes visible instead
 * of invisible.
 */
export const REVIEW_AFTER_DAYS = 90;

export function daysSinceVerified(scheme: LabourScheme, now = new Date()): number | null {
  if (!scheme.verification.verifiedOn) return null;
  const then = Date.parse(`${scheme.verification.verifiedOn}T00:00:00Z`);
  if (!Number.isFinite(then)) return null;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

export function needsReview(scheme: LabourScheme, now = new Date()): boolean {
  if (scheme.verification.status !== "verified") return true;
  const age = daysSinceVerified(scheme, now);
  return age === null || age > REVIEW_AFTER_DAYS;
}
