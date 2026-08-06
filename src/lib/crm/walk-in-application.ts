import "server-only";

import { getAgentServiceBySlug, type AgentService } from "@/lib/agent-services";
import { roleHasCapability } from "@/lib/crm/permissions-core";
import {
  assertOverrideAllowed,
  isValidIndianMobile,
  mapWhatsAppResultToUiState,
  maskIndianMobile,
  normalizeIndianMobileDigits,
  resolveApplicationAuthUserId,
  resolveAuthoritativePrice,
  resolveWalkInAssignment,
  type WalkInNotificationState,
} from "@/lib/crm/walk-in-application-core";
import { createWalkInCustomer, lookupCustomerByMobile, scheduleWalkInApplicationSync } from "@/lib/crm/walk-in";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureWorkId } from "@/lib/workSync";
import { dispatchApplicationNotification } from "@/lib/automation/dispatch-notification";
import { recordApplicationAssignmentEvent } from "@/lib/automation/producers/assignment";

export type CrmServiceCatalogueItem = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  customerFee: number;
  processingTime: string | null;
  requiredDocuments: string | null;
  requiredDocumentsList: AgentService["required_documents_list"];
  instructions: string | null;
  eligibility: string | null;
  isActive: boolean;
  /** Customer-visible initial status label */
  customerInitialStatus: string;
  /** Internal initial status */
  internalInitialStatus: string;
  assignmentRequired: boolean;
};

export type WalkInApplicationSuccess = {
  ok: true;
  deduped: boolean;
  customerId: string;
  applicationId: string;
  workId: string | null;
  customerName: string;
  mobile: string;
  mobileMasked: string;
  serviceSlug: string;
  serviceName: string;
  amount: number;
  paymentStatus: string;
  status: string;
  estimatedCompletion: string | null;
  assigneeId: string | null;
  assignmentLabel: string;
  assignmentReason: string;
  whatsapp: WalkInNotificationState;
  temporaryPin?: string;
  temporaryPinShownOnce?: boolean;
  customerCreatedInRequest: boolean;
};

export async function listActiveCrmServices(): Promise<CrmServiceCatalogueItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("agent_services")
    .select(
      "id, slug, title, category, customer_fee, processing_time, required_documents, required_documents_list, instructions, eligibility, is_active, sort_order, is_featured",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[walk-in-app] services_list_failed", { error: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    category: row.category ?? null,
    customerFee: Number(row.customer_fee ?? 0),
    processingTime: row.processing_time ?? null,
    requiredDocuments: row.required_documents ?? null,
    requiredDocumentsList: (row.required_documents_list as AgentService["required_documents_list"]) ?? null,
    instructions: row.instructions ?? null,
    eligibility: row.eligibility ?? null,
    isActive: Boolean(row.is_active),
    customerInitialStatus: "Submitted",
    internalInitialStatus: "submitted",
    assignmentRequired: false,
  }));
}

async function loadCustomerForWalkIn(customerId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("customers")
    .select("id, name, mobile, email, address, pincode, city, district, state")
    .eq("id", customerId)
    .maybeSingle();

  if (!data) return null;

  const rawEmail = data.email ? String(data.email) : null;
  const publicEmail =
    rawEmail && !rawEmail.toLowerCase().endsWith("@customer.rnos.internal") ? rawEmail : null;

  return {
    id: String(data.id),
    fullName: String(data.name || "Customer"),
    mobile: normalizeIndianMobileDigits(String(data.mobile ?? "")),
    email: publicEmail,
    address: data.address ?? null,
    pincode: data.pincode ?? null,
    city: data.city ?? null,
    district: data.district ?? null,
    state: data.state ?? null,
  };
}

/**
 * Proven production Auth linkage: customers.id == auth.users.id.
 * Never invent linkage from email strings or admin actor ids.
 */
async function resolveCustomerAuthUserId(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(customerId);
    if (error || !data?.user?.id) return null;
    if (data.user.id !== customerId) return null;
    return customerId;
  } catch {
    return null;
  }
}

async function createApplicationViaRpcOrFallback(input: {
  actorId: string;
  idempotencyKey: string;
  customerId: string;
  customerAuthUserId: string | null;
  service: AgentService;
  amount: number;
  originalAmount: number;
  priceOverridden: boolean;
  overrideReason: string | null;
  notes: string | null;
  assigneeId: string | null;
  assignmentReason: string;
  assignedBySystem: boolean;
  customerMobile: string;
  customerName: string;
  customerEmail: string | null;
  referralSource: string | null;
}): Promise<
  | { ok: true; applicationId: string; workId: string | null; status: string; paymentStatus: string; deduped: boolean }
  | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const rpc = await supabase.rpc("create_walk_in_application_core", {
    p_actor_id: input.actorId,
    p_client_idempotency_key: input.idempotencyKey,
    p_customer_id: input.customerId,
    p_agent_service_id: input.service.id,
    p_notes: input.notes,
    p_assignee_id: input.assigneeId,
    p_assignment_reason: input.assignmentReason,
    p_allow_price_override: input.priceOverridden,
    p_override_amount: input.priceOverridden ? input.amount : null,
    p_override_reason: input.overrideReason,
    p_referral_source: input.referralSource,
    p_customer_auth_user_id: input.customerAuthUserId,
  });

  if (!rpc.error && rpc.data) {
    const data = rpc.data as Record<string, unknown>;
    return {
      ok: true,
      applicationId: String(data.applicationId),
      workId: data.workId ? String(data.workId) : null,
      status: String(data.status ?? "submitted"),
      paymentStatus: String(data.paymentStatus ?? "pending"),
      deduped: Boolean(data.deduped),
    };
  }

  // Fallback when migration not applied yet — still enforce idempotency via scoped key lookup.
  if (rpc.error) {
    const msg = `${rpc.error.code ?? ""} ${rpc.error.message ?? ""}`;
    const safeCodes = [
      "actor_required",
      "idempotency_key_required",
      "customer_required",
      "service_required",
      "customer_not_found",
      "customer_mobile_invalid",
      "customer_auth_user_not_found",
      "customer_auth_user_mismatch",
      "service_not_found",
      "inactive_service",
      "invalid_override_amount",
      "override_reason_required",
      "assignee_not_found",
      "walk_in_application_failed",
    ];
    const matched = safeCodes.find((code) => msg.includes(code));
    if (matched && !/PGRST202|42883|does not exist|schema cache/i.test(msg)) {
      console.error("[walk-in-app] rpc_rejected", { code: matched });
      return { ok: false, error: "Application could not be created.", status: matched === "inactive_service" ? 400 : 400 };
    }
    if (!/PGRST202|42883|does not exist|schema cache/i.test(msg)) {
      console.error("[walk-in-app] rpc_failed", { error: "walk_in_application_failed" });
      return { ok: false, error: "Application could not be created.", status: 500 };
    }
  }

  const scopedKey = `walk_in_application_create:${input.actorId}:${input.idempotencyKey}`;

  const existingKey = await supabase
    .from("crm_idempotency_keys")
    .select("response")
    .eq("key", scopedKey)
    .maybeSingle();

  if (existingKey.data?.response) {
    const data = existingKey.data.response as Record<string, unknown>;
    return {
      ok: true,
      applicationId: String(data.applicationId),
      workId: data.workId ? String(data.workId) : null,
      status: String(data.status ?? "submitted"),
      paymentStatus: String(data.paymentStatus ?? "pending"),
      deduped: true,
    };
  }

  const formData = {
    name: input.customerName,
    mobile: input.customerMobile,
    email: input.customerEmail ?? "",
    pincode: "",
    city: "",
    state: "",
    message: input.notes ?? "",
    referral_source: input.referralSource,
    walk_in: true,
    idempotency_key: scopedKey,
  };

  const serviceSnapshot = {
    agent_service_id: input.service.id,
    service_id: input.service.service_id,
    slug: input.service.slug,
    title: input.service.title,
    category: input.service.category,
    customer_fee: input.amount,
    original_customer_fee: input.originalAmount,
    price_overridden: input.priceOverridden,
    override_reason: input.overrideReason,
    required_documents: input.service.required_documents,
    processing_time: input.service.processing_time,
    source: "walk_in",
  };

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      customer_id: input.customerId,
      // Nullable FK → auth.users. Only set when proven customers.id == auth.users.id.
      user_id: input.customerAuthUserId,
      created_by: input.actorId,
      assigned_agent_id: input.assigneeId,
      agent_id: input.assigneeId,
      customer_email: input.customerEmail,
      customer_mobile: input.customerMobile,
      customer_mobile_normalized: input.customerMobile,
      service_id: input.service.service_id || null,
      agent_service_id: input.service.id,
      service_slug: input.service.slug,
      service_name: input.service.title,
      amount: input.amount,
      total_amount: input.amount,
      customer_fee_snapshot: input.amount,
      source_channel: "walk_in",
      source: "offline",
      status: "submitted",
      payment_status: "pending",
      submitted_by_role: "admin",
      ownership_status: "owned",
      form_data: formData,
      service_snapshot: serviceSnapshot,
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    console.error("[walk-in-app] insert_failed", { error: "application_insert_failed" });
    return { ok: false, error: "Application could not be created.", status: 500 };
  }

  const applicationId = String(application.id);

  try {
    await supabase.from("status_logs").insert({
      application_id: applicationId,
      changed_by: input.actorId,
      old_status: null,
      new_status: "submitted",
      note: input.notes || "Walk-in application created.",
    });

    await supabase.from("application_status_logs").insert({
      application_id: applicationId,
      actor_id: input.actorId,
      actor_role: "admin",
      old_status: null,
      new_status: "submitted",
      note: input.notes || "Walk-in application created.",
      metadata: { source: "walk_in", idempotency_key: scopedKey },
    });

    const { data: assignmentHistory } = await supabase
      .from("application_assignment_history")
      .insert({
        application_id: applicationId,
        assigned_user_id: input.assigneeId,
        assigned_role: input.assigneeId ? "assignee" : "unassigned",
        assignment_reason: input.assignmentReason,
        assigned_by: input.actorId,
        assigned_by_system: input.assignedBySystem,
        metadata: { source: "walk_in" },
      })
      .select("id")
      .maybeSingle();

    if (assignmentHistory?.id) {
      // Fire-and-observe after core tx — failure must not roll back the application.
      try {
        await recordApplicationAssignmentEvent({
          applicationId,
          assignmentHistoryId: String(assignmentHistory.id),
          assigneeUserId: input.assigneeId ?? null,
          actorId: input.actorId,
          actorOrigin: "admin",
          reason: input.assignmentReason,
        });
      } catch {
        console.error("[walk-in-app] assignment_event_emit_failed", { applicationId });
      }
    }
    if (input.assigneeId) {
      await supabase.from("assignments").upsert(
        {
          application_id: applicationId,
          agent_id: input.assigneeId,
          assigned_by: input.actorId,
          active: true,
          note: input.assignmentReason,
        },
        { onConflict: "application_id,agent_id" },
      );
    }
  } catch (error) {
    console.error("[walk-in-app] post_insert_failed_rolling_back", {
      applicationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await supabase.from("applications").delete().eq("id", applicationId);
    return { ok: false, error: "Application create rolled back after history failure.", status: 500 };
  }

  const work = await ensureWorkId(applicationId);

  const response = {
    ok: true,
    applicationId,
    workId: work.ok ? work.workId : null,
    status: "submitted",
    paymentStatus: "pending",
    amount: input.amount,
    assigneeId: input.assigneeId,
    assignmentReason: input.assignmentReason,
    customerId: input.customerId,
    serviceSlug: input.service.slug,
    serviceName: input.service.title,
    customerName: input.customerName,
    deduped: false,
  };

  await supabase.from("crm_idempotency_keys").upsert({
    key: scopedKey,
    operation: "walk_in_application_create",
    actor_id: input.actorId,
    client_key: input.idempotencyKey,
    response,
  });

  return {
    ok: true,
    applicationId,
    workId: work.ok ? work.workId : null,
    status: "submitted",
    paymentStatus: "pending",
    deduped: false,
  };
}

export async function createWalkInApplication(input: {
  actorId: string;
  actorRole: string | null | undefined;
  idempotencyKey: string;
  customerId?: string | null;
  newCustomer?: {
    fullName: string;
    mobile: string;
    alternateMobile?: string | null;
    address: string;
    pincode: string;
    city: string;
    district: string;
    state: string;
    referralSource?: string | null;
  } | null;
  serviceSlug: string;
  notes?: string | null;
  assigneeUserId?: string | null;
  priceOverride?: number | null;
  overrideReason?: string | null;
}): Promise<WalkInApplicationSuccess | { ok: false; error: string; status: number; customerId?: string }> {
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  if (idempotencyKey.length < 8) {
    return { ok: false, error: "Idempotency key is required.", status: 400 };
  }

  if (!roleHasCapability(input.actorRole, "applications.create")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const service = await getAgentServiceBySlug(input.serviceSlug);
  if (!service || !service.is_active) {
    return { ok: false, error: "Selected service is inactive or not found.", status: 400 };
  }

  const pricing = resolveAuthoritativePrice(service.customer_fee, input.priceOverride);
  const overrideCheck = assertOverrideAllowed({
    overridden: pricing.overridden,
    overrideReason: input.overrideReason,
    actorCanOverride: roleHasCapability(input.actorRole, "payments.edit"),
  });
  if (!overrideCheck.ok) {
    return { ok: false, error: overrideCheck.error, status: 403 };
  }

  let customerId = input.customerId?.trim() || null;
  let temporaryPin: string | undefined;
  let customerCreatedInRequest = false;
  let customerAuthUserId: string | null = null;
  const referralSource: string | null = input.newCustomer?.referralSource ?? null;

  if (!customerId && input.newCustomer) {
    // Race-safe duplicate re-check immediately before create.
    const mobile = normalizeIndianMobileDigits(input.newCustomer.mobile);
    if (!isValidIndianMobile(mobile)) {
      return { ok: false, error: "Enter a valid 10-digit Indian mobile number.", status: 400 };
    }
    const existing = await lookupCustomerByMobile(mobile);
    if (!existing.ok) return existing;
    if (existing.customer) {
      customerId = existing.customer.id;
    } else {
      const created = await createWalkInCustomer({
        ...input.newCustomer,
        createdByUserId: input.actorId,
      });
      if (!created.ok) return created;
      customerId = created.customerId;
      temporaryPin = created.temporaryPin;
      customerCreatedInRequest = true;
      // New walk-in: Auth user created first; customers.id == auth.users.id.
      customerAuthUserId = created.userId === created.customerId ? created.userId : null;
      if (!customerAuthUserId) {
        return { ok: false, error: "Customer Auth linkage could not be established.", status: 500 };
      }
    }
  }

  if (!customerId) {
    return { ok: false, error: "Customer id or new customer details are required.", status: 400 };
  }

  const customer = await loadCustomerForWalkIn(customerId);
  if (!customer || !isValidIndianMobile(customer.mobile)) {
    return { ok: false, error: "Customer not found or mobile invalid.", status: 404 };
  }

  if (!customerAuthUserId) {
    const linked = await resolveCustomerAuthUserId(customer.id);
    const resolved = resolveApplicationAuthUserId({
      customerId: customer.id,
      customerIdIsAuthUser: Boolean(linked),
      serverResolvedAuthUserId: linked,
      browserProvidedAuthUserId: null,
      actorId: input.actorId,
    });
    if (!resolved.ok) {
      return { ok: false, error: "Customer Auth linkage is invalid.", status: 400 };
    }
    customerAuthUserId = resolved.userId;
  } else {
    const resolved = resolveApplicationAuthUserId({
      customerId: customer.id,
      customerIdIsAuthUser: true,
      serverResolvedAuthUserId: customerAuthUserId,
      browserProvidedAuthUserId: null,
      actorId: input.actorId,
    });
    if (!resolved.ok) {
      return { ok: false, error: "Customer Auth linkage is invalid.", status: 400 };
    }
    customerAuthUserId = resolved.userId;
  }

  // Partners must not create applications for customers outside their scope.
  // Admin walk-in path is admin-only in UI; still enforce partner scope if role is partner.
  if (String(input.actorRole ?? "").toLowerCase().includes("partner") || input.actorRole === "agency_partner" || input.actorRole === "agent") {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: scoped } = await supabase
        .from("customers")
        .select("id")
        .eq("id", customerId)
        .or(`created_by.eq.${input.actorId},assigned_agent_id.eq.${input.actorId}`)
        .maybeSingle();
      if (!scoped && !customerCreatedInRequest) {
        return { ok: false, error: "Customer is outside your authorized scope.", status: 403 };
      }
    }
  }

  const assignment = resolveWalkInAssignment({
    explicitAssigneeId: roleHasCapability(input.actorRole, "applications.assign")
      ? input.assigneeUserId
      : null,
    serviceDefaultAssigneeId: null,
    branchOwnerId: null,
  });

  const created = await createApplicationViaRpcOrFallback({
    actorId: input.actorId,
    idempotencyKey,
    customerId,
    customerAuthUserId,
    service,
    amount: pricing.amount,
    originalAmount: pricing.original,
    priceOverridden: pricing.overridden,
    overrideReason: pricing.overridden ? String(input.overrideReason ?? "").trim() : null,
    notes: input.notes ?? null,
    assigneeId: assignment.assigneeId,
    assignmentReason: assignment.reason,
    assignedBySystem: assignment.bySystem,
    customerMobile: customer.mobile,
    customerName: customer.fullName,
    customerEmail: customer.email,
    referralSource,
  });

  if (!created.ok) {
    return {
      ok: false,
      error: created.error,
      status: created.status,
      // If customer was created but application failed, return id so UI can retry without duplicate customer.
      customerId: customerCreatedInRequest ? customerId : undefined,
    };
  }

  // Sheets sync — outside core DB transaction; failure must not undo application.
  try {
    await scheduleWalkInApplicationSync(created.applicationId);
  } catch (error) {
    console.error("[walk-in-app] sheets_sync_schedule_failed", {
      applicationId: created.applicationId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // WhatsApp outbox — NEVER inside DB transaction; failure must not undo application.
  // Never log temporary PIN. Idempotency key is applicationId:event:version inside adapter.
  let whatsapp: WalkInNotificationState = "queued";
  try {
    const notifyResult = await dispatchApplicationNotification({
      applicationId: created.applicationId,
      eventType: "application_submitted",
      recipientMobile: customer.mobile,
      customerName: customer.fullName,
      serviceName: service.title,
      amount: pricing.amount,
      status: created.status,
      notes: input.notes ?? undefined,
      requiredDocuments: service.required_documents ?? undefined,
      customerId,
      actorId: input.actorId,
      actorOrigin: input.actorRole === "agency_partner" ? "agency_partner" : "admin",
      processRulesInline: true,
    });
    whatsapp = mapWhatsAppResultToUiState(notifyResult);
  } catch (error) {
    console.error("[walk-in-app] whatsapp_enqueue_failed", {
      applicationId: created.applicationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    whatsapp = "queued";
  }

  return {
    ok: true,
    deduped: created.deduped,
    customerId,
    applicationId: created.applicationId,
    workId: created.workId,
    customerName: customer.fullName,
    mobile: customer.mobile,
    mobileMasked: maskIndianMobile(customer.mobile),
    serviceSlug: service.slug,
    serviceName: service.title,
    amount: pricing.amount,
    paymentStatus: created.paymentStatus,
    status: created.status,
    estimatedCompletion: service.processing_time,
    assigneeId: assignment.assigneeId,
    assignmentLabel: assignment.assigneeId ? "Assigned" : "Awaiting assignment",
    assignmentReason: assignment.reason,
    whatsapp,
    temporaryPin,
    temporaryPinShownOnce: Boolean(temporaryPin),
    customerCreatedInRequest,
  };
}

export async function resendWalkInApplicationWhatsApp(input: {
  actorId: string;
  actorRole: string | null | undefined;
  applicationId: string;
}): Promise<{ ok: true; whatsapp: WalkInNotificationState } | { ok: false; error: string; status: number }> {
  if (!roleHasCapability(input.actorRole, "messaging.resend")) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Service unavailable.", status: 503 };

  const { data: application } = await supabase
    .from("applications")
    .select("id, service_name, status, amount, customer_mobile, customer_id, form_data")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (!application) return { ok: false, error: "Application not found.", status: 404 };

  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  const mobile = normalizeIndianMobileDigits(
    String(application.customer_mobile ?? formData.mobile ?? ""),
  );
  if (!isValidIndianMobile(mobile)) {
    return { ok: false, error: "Customer mobile unavailable for WhatsApp.", status: 400 };
  }

  const result = await dispatchApplicationNotification({
    applicationId: input.applicationId,
    eventType: "application_submitted",
    recipientMobile: mobile,
    customerName: String(formData.name ?? "Customer"),
    serviceName: String(application.service_name ?? "Service"),
    amount: application.amount,
    status: String(application.status ?? ""),
    forceRetry: true,
    customerId: application.customer_id ? String(application.customer_id) : null,
    actorId: input.actorId,
    actorOrigin: "admin",
    processRulesInline: true,
  });

  return { ok: true, whatsapp: mapWhatsAppResultToUiState(result) };
}
