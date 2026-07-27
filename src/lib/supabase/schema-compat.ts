/**
 * Graceful compatibility helpers for environments where pending migrations
 * (20260727120000 / 20260727180000) are not yet applied.
 */

export const DATABASE_UPGRADE_REQUIRED_MESSAGE =
  "Database upgrade required. Apply pending migrations before using final-document / WhatsApp delivery features.";

export function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const hay = `${error.code ?? ""} ${error.message ?? ""}`;
  return /PGRST205|42P01|does not exist|schema cache/i.test(hay);
}

export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const hay = `${error.code ?? ""} ${error.message ?? ""}`;
  return /42703|PGRST204|column .* does not exist/i.test(hay);
}

export function isMissingStorageBucketError(error: { message?: string; statusCode?: string | number } | null | undefined) {
  if (!error) return false;
  const hay = `${error.statusCode ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    hay.includes("bucket not found") ||
    hay.includes("not found") && hay.includes("bucket") ||
    hay.includes("the resource was not found")
  );
}

export function upgradeRequiredFromStorageError(error: { message?: string; statusCode?: string | number } | null | undefined) {
  if (isMissingStorageBucketError(error)) {
    return DATABASE_UPGRADE_REQUIRED_MESSAGE;
  }
  return null;
}

export function upgradeRequiredFromDbError(error: { code?: string; message?: string } | null | undefined) {
  if (isMissingRelationError(error) || isMissingColumnError(error)) {
    return DATABASE_UPGRADE_REQUIRED_MESSAGE;
  }
  return null;
}
