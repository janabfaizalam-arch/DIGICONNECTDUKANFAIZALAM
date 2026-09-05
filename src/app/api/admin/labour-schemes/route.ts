import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { isMissingTable, schemeToRow } from "@/lib/labour/rows";
import { SEED_SCHEMES } from "@/lib/labour/seed-schemes";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Editing a scheme, and remembering that it was edited.
 *
 * Every write snapshots the previous row into labour_scheme_versions first.
 * A benefit amount that silently becomes whatever the last person typed is
 * how a page ends up quoting a figure nobody can trace; with the snapshot,
 * "₹55,000 → ₹65,000, by whom, when, from which source" is answerable months
 * later.
 *
 * The route only ever accepts the fields listed below. A scheme's identity —
 * its id and slug — is not editable here: renaming a live slug silently breaks
 * every link anybody has shared.
 */

const EDITABLE = new Set([
  "name",
  "name_hi",
  "category",
  "summary",
  "beneficiaries",
  "benefits",
  "eligibility",
  "key_conditions",
  "documents",
  "process",
  "payment_method",
  "warnings",
  "verification_status",
  "provided_by",
  "verified_on",
  "source_url",
  "source_title",
  "source_date",
  "caveat",
  "sort_order",
  "published",
  "seo_title",
  "seo_description",
]);

const STATUSES = new Set(["verified", "needs_review", "outdated", "archived"]);

function bad(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * A URL an administrator typed, checked before it is stored.
 *
 * The source link is rendered as an anchor on a public page, so a
 * `javascript:` or `data:` value here would be a scripting hole opened through
 * the CMS. Only http(s) is kept.
 */
function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Fill an empty table from the file the page falls back to.
 *
 * Until this runs, `labour_schemes` is empty, the page reads the seed file,
 * and every edit in the admin panel has nothing to write to — which is how a
 * screen full of buttons came to do nothing at all. Rather than telling an
 * administrator to open a terminal and run a script, the panel does it.
 *
 * Existing rows are left alone. The database is supposed to outrank the file:
 * an amount somebody corrected here must not be overwritten by an import.
 */
export async function POST() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return bad("Not allowed.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return bad("Database is not configured.", 503);

  const { data: existing, error: readError } = await supabase.from("labour_schemes").select("id");
  if (readError) {
    return isMissingTable(readError)
      ? bad(
          "labour_schemes table abhi bani nahi hai. Pehle Supabase SQL editor mein migration " +
            "20260904140000_labour_schemes.sql chalaiye, phir ye button dobara dabaiye.",
          409,
        )
      : bad("Could not read the schemes table.", 500);
  }

  const known = new Set((existing ?? []).map((row) => (row as { id: string }).id));
  const toWrite = SEED_SCHEMES.filter((scheme) => !known.has(scheme.id)).map(schemeToRow);

  if (!toWrite.length) {
    return NextResponse.json({ ok: true, imported: 0, existing: known.size });
  }

  const { error: writeError } = await supabase.from("labour_schemes").upsert(toWrite, { onConflict: "id" });
  if (writeError) {
    return isMissingTable(writeError)
      ? bad(
          "labour_schemes table abhi bani nahi hai. Pehle migration 20260904140000_labour_schemes.sql chalaiye.",
          409,
        )
      : bad("Could not write the schemes.", 500);
  }

  revalidatePath("/services/labour-card");
  return NextResponse.json({ ok: true, imported: toWrite.length, existing: known.size });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return bad("Not allowed.", 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return bad("Database is not configured.", 503);

  let body: { id?: unknown; patch?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return bad("That request could not be read.", 400);
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return bad("Which scheme?", 400);
  if (!body.patch || typeof body.patch !== "object") return bad("Nothing to change.", 400);

  const incoming = body.patch as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!EDITABLE.has(key)) continue;
    if (key === "verification_status" && (typeof value !== "string" || !STATUSES.has(value))) continue;
    if (key === "source_url") {
      update[key] = safeUrl(value);
      continue;
    }
    update[key] = value;
  }
  if (!Object.keys(update).length) return bad("Nothing to change.", 400);

  // The row as it stands, kept before it stops standing that way.
  const { data: before, error: readError } = await supabase
    .from("labour_schemes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return isMissingTable(readError)
      ? bad("labour_schemes table abhi bani nahi hai — pehle migration chalaiye.", 409)
      : bad("Could not read that scheme.", 500);
  }
  if (!before) return bad("That scheme does not exist.", 404);

  update.updated_at = new Date().toISOString();

  const { data: after, error: writeError } = await supabase
    .from("labour_schemes")
    .update(update)
    .eq("id", id)
    .select("id");

  if (writeError) return bad("Could not save.", 500);
  /*
    PostgREST reports an update that matched nothing as a success. Without
    this check an administrator would be told the amount was saved while the
    page kept showing the old one.
  */
  if (!after || after.length === 0) return bad("That scheme could not be updated.", 404);

  await supabase.from("labour_scheme_versions").insert({
    scheme_id: id,
    snapshot: before,
    changed_fields: Object.keys(update).filter((key) => key !== "updated_at"),
    reason: typeof body.reason === "string" ? body.reason.slice(0, 500) : "",
    source_url: safeUrl(incoming.source_url) ?? (before as { source_url?: string }).source_url ?? null,
    changed_by: user.email ?? user.id ?? "admin",
  });

  revalidatePath("/services/labour-card");
  return NextResponse.json({ ok: true });
}
