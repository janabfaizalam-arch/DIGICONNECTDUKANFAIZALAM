/**
 * "This column does not exist" — from Postgres (42703) or from PostgREST's
 * schema cache (PGRST204), which is what a write naming a column from a
 * migration that has not been applied yet comes back with.
 *
 * Code that must keep working while a database is one migration behind (a
 * deploy that beat its migration, a cache that has not reloaded) checks this
 * and retries with only the columns that have always existed, instead of
 * failing a payment or a printer heartbeat over an optional column.
 */
export function isMissingColumnError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column .* does not exist|could not find the .* column/i.test(String(error.message ?? ""));
}
