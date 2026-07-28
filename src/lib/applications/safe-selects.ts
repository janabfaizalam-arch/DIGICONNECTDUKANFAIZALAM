/**
 * Role-specific application column lists.
 * Keep final document paths / WhatsApp internals out of customer & partner shapes.
 */

/** Safe for customer dashboards — no paths, WhatsApp, or internal notes. */
export const CUSTOMER_APPLICATION_SELECT = [
  "id",
  "user_id",
  "customer_id",
  "service_id",
  "service_slug",
  "service_name",
  "amount",
  "total_amount",
  "status",
  "payment_status",
  "form_data",
  "customer_details",
  "customer_message",
  "customer_note",
  "customer_mobile",
  "customer_email",
  "submitted_at",
  "paid_at",
  "completed_at",
  "created_at",
  "updated_at",
  "wallet_used_amount",
  "wallet_redeemed_amount",
  "fresh_payable_amount",
  "application_code",
].join(", ");

/** Safe for Digi Partner / agent UIs. */
export const PARTNER_APPLICATION_SELECT = [
  "id",
  "user_id",
  "customer_id",
  "agency_partner_id",
  "agent_id",
  "assigned_agent_id",
  "created_by",
  "created_by_agent_id",
  "service_id",
  "service_slug",
  "service_name",
  "amount",
  "total_amount",
  "status",
  "payment_status",
  "form_data",
  "customer_details",
  "customer_mobile",
  "commission_amount",
  "submitted_at",
  "paid_at",
  "completed_at",
  "created_at",
  "updated_at",
  "application_code",
  "application_source",
  "source",
  "submitted_by_role",
].join(", ");

/**
 * Admin operational select — prefer this over `*`.
 * Includes post-migration columns; callers must fall back on missing-column errors.
 */
export const ADMIN_APPLICATION_SELECT = [
  "id",
  "user_id",
  "customer_id",
  "agency_partner_id",
  "agent_id",
  "assigned_agent_id",
  "assigned_to",
  "created_by",
  "created_by_agent_id",
  "service_id",
  "service_slug",
  "service_name",
  "amount",
  "total_amount",
  "status",
  "payment_status",
  "form_data",
  "customer_details",
  "customer_mobile",
  "customer_email",
  "customer_message",
  "customer_note",
  "internal_notes",
  "admin_note",
  "commission_amount",
  "cashback_enabled",
  "cashback_amount",
  "cashback_expiry_days",
  "cashback_credited_at",
  "cashback_eligible_amount",
  "wallet_used_amount",
  "wallet_redeemed_amount",
  "fresh_payable_amount",
  "real_payment_amount",
  "razorpay_order_id",
  "razorpay_payment_id",
  "payment_screenshot_url",
  "payment_screenshot_path",
  "final_document_id",
  "final_document_name",
  "final_document_path",
  "completed_document_storage_path",
  "completed_at",
  "priority",
  "due_at",
  "whatsapp_final_delivery_status",
  "whatsapp_final_delivered_at",
  "application_source",
  "source_channel",
  "source",
  "submitted_by_role",
  "submitted_at",
  "paid_at",
  "created_at",
  "updated_at",
  "application_code",
].join(", ");

/**
 * Production-safe legacy select: only columns known present before
 * 20260727120000 / 20260727180000. Avoids July-era optional columns
 * (application_source text, application_code) that may not be applied.
 */
export const ADMIN_APPLICATION_SELECT_LEGACY = [
  "id",
  "user_id",
  "customer_id",
  "agency_partner_id",
  "agent_id",
  "assigned_agent_id",
  "assigned_to",
  "created_by",
  "created_by_agent_id",
  "service_id",
  "service_slug",
  "service_name",
  "amount",
  "total_amount",
  "status",
  "payment_status",
  "form_data",
  "customer_details",
  "customer_mobile",
  "customer_message",
  "internal_notes",
  "admin_note",
  "commission_amount",
  "cashback_enabled",
  "cashback_amount",
  "cashback_expiry_days",
  "wallet_used_amount",
  "wallet_redeemed_amount",
  "fresh_payable_amount",
  "real_payment_amount",
  "razorpay_order_id",
  "razorpay_payment_id",
  "payment_screenshot_url",
  "payment_screenshot_path",
  "final_document_name",
  "final_document_path",
  "final_document_url",
  "completed_document_url",
  "completed_document_storage_path",
  "completed_at",
  "source_channel",
  "source",
  "submitted_by_role",
  "submitted_at",
  "paid_at",
  "created_at",
  "updated_at",
].join(", ");

/** Absolute minimal fallback if even LEGACY hits a missing column. */
export const ADMIN_APPLICATION_SELECT_MINIMAL = [
  "id",
  "user_id",
  "agent_id",
  "service_slug",
  "service_name",
  "amount",
  "form_data",
  "status",
  "payment_status",
  "final_document_url",
  "final_document_name",
  "final_document_path",
  "assigned_to",
  "customer_message",
  "internal_notes",
  "created_at",
  "updated_at",
].join(", ");

/** Fields that must never be returned to customer/partner application payloads. */
export const SENSITIVE_APPLICATION_FIELDS = [
  "final_document_path",
  "final_document_url",
  "final_document_id",
  "completed_document_url",
  "completed_document_storage_path",
  "internal_notes",
  "admin_note",
  "whatsapp_final_delivery_status",
  "whatsapp_final_delivered_at",
  "priority",
  "due_at",
] as const;

export function stripSensitiveApplicationFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row } as Record<string, unknown>;
  for (const key of SENSITIVE_APPLICATION_FIELDS) {
    delete next[key];
  }
  next.final_document_url = null;
  next.completed_document_url = null;
  return next as T;
}

/** Fill missing post-migration fields so UI never reads undefined as crash. */
export function normalizeAdminApplicationRow<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    final_document_url: null,
    completed_document_url: null,
    final_document_id: row.final_document_id ?? null,
    priority: row.priority ?? null,
    due_at: row.due_at ?? null,
    whatsapp_final_delivery_status: row.whatsapp_final_delivery_status ?? null,
    whatsapp_final_delivered_at: row.whatsapp_final_delivered_at ?? null,
    customer_note: row.customer_note ?? row.customer_message ?? null,
    application_source: row.application_source ?? null,
    application_code: row.application_code ?? null,
    source_channel: row.source_channel ?? null,
    cashback_credited_at: row.cashback_credited_at ?? null,
    cashback_eligible_amount: row.cashback_eligible_amount ?? null,
  } as T;
}
