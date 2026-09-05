import type { LabourScheme } from "@/lib/labour/types";

/**
 * A scheme record as the `labour_schemes` table wants it.
 *
 * This mapping used to live inside the seeding script. It moved here the day
 * the admin panel grew an "import into the database" button: two copies of a
 * column list drift, and the copy that drifts is the one that silently writes
 * a null into a column the page reads.
 */
export type LabourSchemeRow = {
  id: string;
  slug: string;
  name: string;
  name_hi: string;
  category: string;
  summary: string;
  beneficiaries: string[];
  benefits: unknown;
  eligibility: string[];
  key_conditions: unknown;
  documents: string[];
  process: string[];
  payment_method: string;
  warnings: string[];
  verification_status: string;
  provided_by: string;
  verified_on: string | null;
  source_url: string | null;
  source_title: string;
  source_date: string | null;
  caveat: string;
  sort_order: number;
  published: boolean;
};

export function schemeToRow(scheme: LabourScheme): LabourSchemeRow {
  return {
    id: scheme.id,
    slug: scheme.slug,
    name: scheme.name,
    name_hi: scheme.nameHi ?? "",
    category: scheme.category,
    summary: scheme.summary,
    beneficiaries: scheme.beneficiaries,
    benefits: scheme.benefits,
    eligibility: scheme.eligibility,
    key_conditions: scheme.keyConditions,
    documents: scheme.documents,
    process: scheme.process,
    payment_method: scheme.paymentMethod,
    warnings: scheme.warnings ?? [],
    verification_status: scheme.verification.status,
    provided_by: scheme.verification.providedBy,
    verified_on: scheme.verification.verifiedOn || null,
    source_url: scheme.verification.sourceUrl,
    source_title: scheme.verification.sourceTitle,
    source_date: scheme.verification.sourceDate,
    caveat: scheme.verification.caveat ?? "",
    sort_order: scheme.sortOrder,
    published: scheme.published,
  };
}

/**
 * Postgres says "relation does not exist"; PostgREST says the schema cache has
 * no such table. Either way the answer an administrator needs is the same one,
 * and it is not "could not save" — it is "the migration has not been run yet".
 */
export function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /relation .*labour_schemes.* does not exist|could not find the table/i.test(error.message ?? "");
}
