import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function logAuthSecurityEvent(input: {
  userId?: string | null;
  phone?: string | null;
  eventType: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("auth_security_events").insert({
    user_id: input.userId ?? null,
    phone: input.phone ?? null,
    event_type: input.eventType,
    details: input.details ?? {},
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
}
