// ============================================================================
// Agency Partner Audit Logging
// DigiConnect Dukan — AP Ecosystem
// Immutable append-only audit trail.
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AuditAction, AuditLog } from "@/lib/ap-types";

export async function logAuditEvent(params: {
  actorId: string | null;
  actorRole?: string | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from("audit_logs").insert({
      actor_id: params.actorId,
      actor_role: params.actorRole ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    // Audit logging should never block the main flow
    console.error("[ap-audit] Failed to write audit log", {
      action: params.action,
      entityType: params.entityType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (params.entityType) query = query.eq("entity_type", params.entityType);
  if (params.entityId) query = query.eq("entity_id", params.entityId);
  if (params.actorId) query = query.eq("actor_id", params.actorId);
  if (params.action) query = query.eq("action", params.action);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []) as AuditLog[];
}
