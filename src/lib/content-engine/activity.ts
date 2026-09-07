import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redact } from "@/lib/content-engine/errors";
import type { ActivityEntry } from "@/lib/content-engine/types";

/**
 * The record of what this engine did, and on whose say-so.
 *
 * Months from now the question will be "who approved the post that quoted
 * ₹65,000?" and a status column cannot answer it. Every transition is written
 * here with the actor's identity, so an amount on a public page traces back
 * to a person.
 *
 * Logging never throws. A history row that fails to write is worth a warning
 * in the server log; it is not worth failing an approval that has already
 * happened, and an engine that falls over because its audit trail is
 * unavailable is an engine nobody can use.
 */
export async function logActivity(entry: {
  entity: ActivityEntry["entity"];
  entityId: string | null;
  action: string;
  actor: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: string;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await supabase.from("content_activity").insert({
      entity: entry.entity,
      entity_id: entry.entityId,
      action: entry.action.slice(0, 120),
      actor: entry.actor.slice(0, 200),
      from_status: entry.fromStatus ?? null,
      to_status: entry.toStatus ?? null,
      // Detail can carry a model's words or an API's error text, either of
      // which may contain something credential-shaped.
      detail: redact(entry.detail ?? "").slice(0, 1000),
    });
  } catch (caught) {
    console.warn("[content-engine] could not write activity", {
      action: entry.action,
      detail: redact(caught instanceof Error ? caught.message : String(caught)),
    });
  }
}

/** Who did this, for the log. Falls back to a name, never to an empty string. */
export function actorFrom(user: { email?: string | null; id?: string | null } | null): string {
  return user?.email || user?.id || "unknown-admin";
}
