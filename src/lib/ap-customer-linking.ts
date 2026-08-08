// ============================================================================
// Customer Mobile Linking for Agency Partner Ecosystem
// DigiConnect Dukan — AP Ecosystem
//
// When a customer signs up or logs in with a mobile number,
// this module detects historical applications created by an AP
// for that same mobile and links them to the customer's account.
// ============================================================================

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/ap-audit";

/**
 * Link applications created by agency partners to a customer who signs up
 * with the same mobile number.
 *
 * This is idempotent — safe to call multiple times.
 *
 * Preserves:
 * - agency_partner_id (attribution)
 * - commission history
 * - original created_at
 *
 * Updates:
 * - user_id → customer's auth user_id
 * - ownership_status → 'linked'
 */
export async function linkCustomerApplicationsByMobile(params: {
  customerUserId: string;
  mobile: string;
}): Promise<{ linked: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { linked: 0 };

  const normalizedMobile = params.mobile.replace(/\D/g, "").slice(-10);
  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return { linked: 0 };
  }

  try {
    // Find applications with matching customer_mobile that:
    // 1. Were created by an agency_partner (agency_partner_id is not null)
    // 2. Are still UNCLAIMED (user_id is null)
    //
    // Claiming rows already owned by another user_id would transfer that
    // person's application — and its documents and payments — to whoever next
    // signs up with the same mobile. The partner-entered mobile is not a
    // verified identity, so only unclaimed rows may be linked.
    const { data: matchingApps, error: searchError } = await supabase
      .from("applications")
      .select("id, user_id, agency_partner_id, customer_mobile_normalized, service_name")
      .not("agency_partner_id", "is", null)
      .eq("customer_mobile_normalized", normalizedMobile)
      .is("user_id", null);

    if (searchError) {
      console.error("[ap-customer-linking] Search failed", searchError);
      return { linked: 0, error: searchError.message };
    }

    if (!matchingApps?.length) {
      return { linked: 0 };
    }

    console.info("[ap-customer-linking] Found matching applications", {
      customerUserId: params.customerUserId,
      mobile: normalizedMobile,
      count: matchingApps.length,
      applicationIds: matchingApps.map((a) => (a as { id: string }).id),
    });

    // Link each application to the customer
    const appIds = matchingApps.map((a) => (a as { id: string }).id);

    // Re-assert `user_id is null` in the write itself: another signup could have
    // claimed the same rows between the select above and this update.
    const { data: claimedRows, error: updateError } = await supabase
      .from("applications")
      .update({
        user_id: params.customerUserId,
        ownership_status: "linked",
        updated_at: new Date().toISOString(),
      })
      .in("id", appIds)
      .is("user_id", null)
      .select("id, agency_partner_id");

    if (updateError) {
      console.error("[ap-customer-linking] Update failed", updateError);
      return { linked: 0, error: updateError.message };
    }

    const claimed = (claimedRows ?? []) as Array<{ id: string; agency_partner_id: string }>;
    if (!claimed.length) {
      return { linked: 0 };
    }

    // Record mobile links for the rows this call actually claimed.
    const linkRecords = claimed.map((a) => ({
      mobile: normalizedMobile,
      customer_user_id: params.customerUserId,
      agency_partner_id: a.agency_partner_id,
      application_id: a.id,
      linked_at: new Date().toISOString(),
      auto_linked: true,
    }));

    try {
      await supabase
        .from("customer_mobile_links")
        .upsert(linkRecords, { onConflict: "id" });
    } catch (err) {
      console.warn("[ap-customer-linking] Mobile link upsert warning", err);
    }

    // Audit log
    await logAuditEvent({
      actorId: params.customerUserId,
      actorRole: "customer",
      action: "customer_linked",
      entityType: "customer",
      entityId: params.customerUserId,
      newData: {
        mobile: normalizedMobile,
        linkedApplicationIds: claimed.map((a) => a.id),
        linkedCount: claimed.length,
      },
    });

    console.info("[ap-customer-linking] Successfully linked applications", {
      customerUserId: params.customerUserId,
      linkedCount: claimed.length,
    });

    return { linked: claimed.length };
  } catch (error) {
    console.error("[ap-customer-linking] Unexpected error", error);
    return { linked: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * When an AP creates an application, normalize and store the customer mobile
 * for future linking.
 */
export function normalizeCustomerMobile(mobile: string): string {
  return mobile.replace(/\D/g, "").slice(-10);
}
