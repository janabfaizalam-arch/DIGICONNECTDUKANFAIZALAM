/**
 * Customer-safe activity timeline helpers.
 * Excludes admin/internal notes and actor identity metadata.
 */

const INTERNAL_NOTE_PATTERNS = [
  /\binternal\b/i,
  /\badmin\b/i,
  /\bcommission\b/i,
  /\bwhatsapp\b/i,
  /\baisensy\b/i,
  /\bstorage[_ ]?path\b/i,
  /\bsigned[_ ]?url\b/i,
  /\bprovider\b/i,
  /\bpartner\b/i,
];

export type CustomerActivityItem = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export function isCustomerSafeActivityNote(note: string | null | undefined): boolean {
  const value = String(note ?? "").trim();
  if (!value) return false;
  return !INTERNAL_NOTE_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeCustomerActivityDescription(
  note: string | null | undefined,
): string | null {
  if (!isCustomerSafeActivityNote(note)) return null;
  return String(note).trim();
}

export function mapStatusLogToCustomerActivity(log: {
  id: string;
  new_status?: string | null;
  note?: string | null;
  created_at: string;
}): CustomerActivityItem {
  const status = String(log.new_status ?? "updated").replace(/_/g, " ");
  return {
    id: log.id,
    title: `Status: ${status}`,
    description: sanitizeCustomerActivityDescription(log.note),
    created_at: log.created_at,
  };
}

export function mapTimelineToCustomerActivity(row: {
  id: string;
  event_title?: string | null;
  event_description?: string | null;
  created_at: string;
  customer_visible?: boolean | null;
}): CustomerActivityItem | null {
  if (row.customer_visible === false) return null;
  const title = String(row.event_title ?? "").trim() || "Update";
  const description = sanitizeCustomerActivityDescription(row.event_description);
  // Drop timeline rows whose only content was an unsafe internal note
  if (!description && INTERNAL_NOTE_PATTERNS.some((p) => p.test(String(row.event_description ?? "")))) {
    return null;
  }
  return {
    id: row.id,
    title,
    description,
    created_at: row.created_at,
  };
}

export function mergeCustomerActivity(
  items: CustomerActivityItem[],
): CustomerActivityItem[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const deduped: CustomerActivityItem[] = [];
  for (const item of sorted) {
    const duplicate = deduped.some((existing) => {
      const timeDiff = Math.abs(
        new Date(existing.created_at).getTime() - new Date(item.created_at).getTime(),
      );
      if (timeDiff >= 2000) return false;
      const a = existing.title.toLowerCase();
      const b = item.title.toLowerCase();
      return (a.includes("status") || a.includes("transition")) && (b.includes("status") || b.includes("transition"));
    });
    if (!duplicate) deduped.push(item);
  }
  return deduped;
}
