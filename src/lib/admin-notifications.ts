import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminNotificationType =
  | "new_lead"
  | "new_application"
  | "payment_pending"
  | "insurance_quotation"
  | "document_uploaded"
  | "final_document_pending";

export type CreateAdminNotificationInput = {
  type: AdminNotificationType;
  title: string;
  message: string;
  relatedType?: "lead" | "application" | "insurance_quotation" | "payment" | "document";
  relatedId?: string | null;
};

export async function createAdminNotification(
  supabase: SupabaseClient,
  input: CreateAdminNotificationInput,
) {
  const { error } = await supabase.from("admin_notifications").insert({
    type: input.type,
    title: input.title,
    message: input.message,
    related_type: input.relatedType ?? null,
    related_id: input.relatedId ?? null,
    is_read: false,
  });

  if (error) {
    console.warn("[admin-notifications] Insert failed", error.message);
  }
}

export async function createAdminNotifications(
  supabase: SupabaseClient,
  inputs: CreateAdminNotificationInput[],
) {
  if (!inputs.length) return;

  const { error } = await supabase.from("admin_notifications").insert(
    inputs.map((input) => ({
      type: input.type,
      title: input.title,
      message: input.message,
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
      is_read: false,
    })),
  );

  if (error) {
    console.warn("[admin-notifications] Batch insert failed", error.message);
  }
}
