/**
 * Graceful compatibility helpers for environments where pending migrations
 * (20260727120000 / 20260727180000) are not yet applied.
 */

export const DATABASE_UPGRADE_REQUIRED_MESSAGE =
  "Database upgrade required. Apply pending migrations before using final-document / WhatsApp delivery features.";

export type DbErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null | undefined;

function errorHaystack(error: DbErrorLike) {
  if (!error) return "";
  return `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
}

export function isMissingRelationError(error: DbErrorLike) {
  if (!error) return false;
  const hay = errorHaystack(error);
  // Relation/table missing — not every "does not exist" (could be a column).
  return /PGRST205|42P01|Could not find the table|relation .* does not exist/i.test(hay);
}

/**
 * Missing-column / schema-cache column errors only.
 * Do NOT treat generic failures, auth, or network errors as schema gaps.
 */
export function isMissingColumnError(error: DbErrorLike) {
  if (!error) return false;
  const hay = errorHaystack(error);
  const code = String(error.code ?? "").toUpperCase();

  if (code === "42703" || code === "PGRST204") return true;

  if (/column .+ does not exist/i.test(hay)) return true;
  if (/Could not find the .+ column/i.test(hay)) return true;
  if (/Could not find the '.+' column of '.+' in the schema cache/i.test(hay)) return true;

  // PostgREST sometimes surfaces unknown columns without 42703 in older stacks.
  if (/PGRST204/i.test(hay)) return true;

  return false;
}

export function isAuthOrPermissionError(error: DbErrorLike) {
  if (!error) return false;
  const hay = errorHaystack(error);
  const code = String(error.code ?? "").toUpperCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|jwt|not authorized|row-level security|rls/i.test(hay)
  );
}

export function isMissingStorageBucketError(error: { message?: string; statusCode?: string | number } | null | undefined) {
  if (!error) return false;
  const hay = `${error.statusCode ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    hay.includes("bucket not found") ||
    (hay.includes("not found") && hay.includes("bucket")) ||
    hay.includes("the resource was not found")
  );
}

export function upgradeRequiredFromStorageError(error: { message?: string; statusCode?: string | number } | null | undefined) {
  if (isMissingStorageBucketError(error)) {
    return DATABASE_UPGRADE_REQUIRED_MESSAGE;
  }
  return null;
}

export function upgradeRequiredFromDbError(error: DbErrorLike) {
  if (isMissingRelationError(error) || isMissingColumnError(error)) {
    return DATABASE_UPGRADE_REQUIRED_MESSAGE;
  }
  return null;
}
