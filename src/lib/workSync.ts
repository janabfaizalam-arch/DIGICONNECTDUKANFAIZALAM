import "server-only";

import { ensureCustomerCode, upsertCustomerMasterRow } from "@/lib/customerMaster";
import {
  CUSTOMER_WORK_FIRST_DATA_ROW,
  CUSTOMER_WORK_HEADERS,
  CUSTOMER_WORK_SHEET,
  findSheetRowByKey,
  isValidSheetDataRow,
  upsertSheetRow,
} from "@/lib/googleSheets";
import { loadGoogleSheetsConfig } from "@/lib/google";
import { resolveCrmPayment } from "@/lib/paymentSync";
import { crmDatesForStatus, defaultExpectedCompletionIso } from "@/lib/statusSync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeMobile(input: unknown): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function ensureWorkId(applicationId: string): Promise<{ ok: true; workId: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase admin unavailable" };

  const withWorkId = await supabase
    .from("applications")
    .select("id, work_id, created_at")
    .eq("id", applicationId)
    .maybeSingle();

  let createdAt = new Date().toISOString();
  if (!withWorkId.error && withWorkId.data) {
    if (withWorkId.data.work_id) return { ok: true, workId: String(withWorkId.data.work_id) };
    createdAt = String(withWorkId.data.created_at || createdAt);
  } else {
    const basic = await supabase.from("applications").select("id, created_at").eq("id", applicationId).maybeSingle();
    if (basic.error || !basic.data) return { ok: false, error: basic.error?.message || "Application not found" };
    createdAt = String(basic.data.created_at || createdAt);
  }

  const day = createdAt.slice(0, 10).replace(/-/g, "");
  const suffix = applicationId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const workId = `W-${day}-${suffix}`;

  const { error: updateError } = await supabase.from("applications").update({ work_id: workId }).eq("id", applicationId);
  if (updateError) {
    // Column may not exist until migration is applied — still sync using deterministic Work ID.
    console.warn("[workSync] work_id_persist_skipped", {
      applicationId,
      error: updateError.message,
    });
  }
  return { ok: true, workId };
}

type ApplicationCrmSource = {
  id: string;
  work_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  service_name?: string | null;
  amount?: number | null;
  total_amount?: number | null;
  real_payment_amount?: number | null;
  wallet_used_amount?: number | null;
  paid_amount?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_mobile_normalized?: string | null;
  customer_details?: unknown;
  form_data?: unknown;
  submitted_by_role?: string | null;
  application_source?: string | null;
  source?: string | null;
  source_channel?: string | null;
  agent_id?: string | null;
  agency_partner_id?: string | null;
  assigned_to?: string | null;
  assigned_agent_id?: string | null;
  invoice_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  admin_note?: string | null;
  customer_note?: string | null;
  whatsapp_final_delivery_status?: string | null;
  expected_completion_at?: string | null;
  notes?: string | null;
  whatsapp_status?: string | null;
};

/**
 * Full Customer Work + Customer Master upsert for one application.
 * Idempotent on Application ID — never creates duplicate work rows.
 */
export async function syncApplicationToSheets(
  applicationId: string,
  options: { whatsappStatus?: string | null; notes?: string | null } = {},
): Promise<{ ok: true; workId: string; customerCode: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase admin unavailable" };

  const loaded = loadGoogleSheetsConfig();
  if (!loaded.ok) return { ok: false, error: loaded.error };

  const work = await ensureWorkId(applicationId);
  if (!work.ok) return work;

  const primarySelect =
    "id, work_id, status, payment_status, service_name, amount, total_amount, real_payment_amount, wallet_used_amount, customer_id, customer_name, customer_mobile, customer_mobile_normalized, customer_details, form_data, submitted_by_role, application_source, source, source_channel, agent_id, agency_partner_id, assigned_to, assigned_agent_id, invoice_id, razorpay_payment_id, created_at, updated_at, due_at, completed_at, admin_note, customer_note, whatsapp_final_delivery_status";

  let app: ApplicationCrmSource | null = null;
  {
    const first = await supabase.from("applications").select(primarySelect).eq("id", applicationId).maybeSingle();
    if (!first.error && first.data) {
      app = first.data as ApplicationCrmSource;
    } else {
      const fallback = await supabase
        .from("applications")
        .select(
          "id, status, payment_status, service_name, amount, total_amount, customer_id, customer_mobile, customer_details, form_data, agent_id, agency_partner_id, razorpay_payment_id, created_at, updated_at",
        )
        .eq("id", applicationId)
        .maybeSingle();
      if (fallback.error || !fallback.data) {
        return { ok: false, error: fallback.error?.message || first.error?.message || "Application not found" };
      }
      app = fallback.data as ApplicationCrmSource;
    }
  }

  const application = app;
  const details = asRecord(application.customer_details);
  const formData = asRecord(application.form_data);

  const mobile =
    normalizeMobile(application.customer_mobile_normalized) ||
    normalizeMobile(application.customer_mobile) ||
    normalizeMobile(details.mobile) ||
    normalizeMobile(formData.mobile);

  const customerName =
    text(application.customer_name) ||
    text(details.name) ||
    text(details.full_name) ||
    text(formData.name) ||
    text(formData.full_name) ||
    "Customer";

  const address =
    text(details.address) || text(formData.address) || text(details.full_address) || "";
  const pincode = text(details.pincode) || text(formData.pincode) || "";
  const city = text(details.city) || text(formData.city) || "";
  const district = text(details.district) || text(formData.district) || "";
  const state = text(details.state) || text(formData.state) || "";
  const alternateMobile =
    normalizeMobile(details.alternate_mobile) ||
    normalizeMobile(details.alt_mobile) ||
    normalizeMobile(formData.alternate_mobile) ||
    "";

  const customer = await ensureCustomerCode({
    customerId: application.customer_id,
    mobile,
    name: customerName,
  });
  if (!customer.ok) return customer;

  const [{ data: invoice }, { data: payment }, { data: workStats }] = await Promise.all([
    application.invoice_id
      ? supabase
          .from("invoices")
          .select("id, invoice_number, amount, payment_status")
          .eq("id", application.invoice_id)
          .maybeSingle()
      : supabase
          .from("invoices")
          .select("id, invoice_number, amount, payment_status")
          .eq("application_id", applicationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, razorpay_payment_id, status, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    customer.customerId
      ? supabase
          .from("applications")
          .select("id, amount, total_amount, payment_status, created_at")
          .eq("customer_id", customer.customerId)
      : Promise.resolve({ data: null as null }),
  ]);

  const totalFee = application.total_amount ?? application.amount ?? invoice?.amount ?? 0;
  const amountReceived =
    application.real_payment_amount ??
    application.paid_amount ??
    (payment && ["captured", "paid", "success", "verified"].includes(String(payment.status || "").toLowerCase())
      ? payment.amount
      : 0);

  const paymentFields = resolveCrmPayment({
    totalFee,
    amountReceived,
    paymentStatus: application.payment_status || invoice?.payment_status,
  });

  const dates = { ...crmDatesForStatus(application.status) };
  if (dates.workStatus === "Completed" && application.completed_at) {
    dates.completedDate = text(application.completed_at).slice(0, 10) || dates.completedDate;
  }
  const expectedCompletion =
    text(application.due_at).slice(0, 10) ||
    text(application.expected_completion_at).slice(0, 10) ||
    defaultExpectedCompletionIso(7);

  const appliedByType =
    text(application.submitted_by_role) ||
    text(application.application_source) ||
    text(application.source) ||
    text(application.source_channel) ||
    "customer";

  const assignedTo =
    text(application.assigned_to) ||
    text(application.assigned_agent_id) ||
    text(application.agent_id) ||
    text(application.agency_partner_id) ||
    "";

  const teamType = application.agency_partner_id
    ? "Agency Partner"
    : application.agent_id
      ? "Employee"
      : appliedByType.toLowerCase().includes("admin")
        ? "Admin"
        : "Customer";

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in").replace(/\/$/, "");
  const invoiceNo = text(invoice?.invoice_number);
  const invoiceLink = invoice?.id ? `${siteUrl}/invoice/${invoice.id}` : "";
  const paymentId =
    text(application.razorpay_payment_id) || text(payment?.razorpay_payment_id) || text(payment?.id);

  const whatsappStatus =
    text(options.whatsappStatus) ||
    text(application.whatsapp_final_delivery_status) ||
    text(application.whatsapp_status) ||
    "Pending";

  const entryDate = text(application.created_at).slice(0, 10);
  const lastUpdated = new Date().toISOString();

  let mappedRow: number | null = null;
  const { data: existingMap } = await supabase
    .from("crm_sheet_row_map")
    .select("row_number")
    .eq("spreadsheet_id", loaded.config.spreadsheetId)
    .eq("sheet_name", CUSTOMER_WORK_SHEET)
    .eq("entity_type", "customer_work")
    .eq("entity_key", applicationId)
    .maybeSingle();
  mappedRow = existingMap?.row_number ?? null;

  // Never trust mapped title/header rows (Customer Work data starts at row 3).
  if (mappedRow != null && !isValidSheetDataRow(CUSTOMER_WORK_SHEET, mappedRow)) {
    console.warn("[work-sync] invalid_mapped_row", {
      applicationId,
      mappedRow,
      firstDataRow: CUSTOMER_WORK_FIRST_DATA_ROW,
    });
    if (existingMap) {
      await supabase
        .from("crm_sheet_row_map")
        .delete()
        .eq("spreadsheet_id", loaded.config.spreadsheetId)
        .eq("sheet_name", CUSTOMER_WORK_SHEET)
        .eq("entity_type", "customer_work")
        .eq("entity_key", applicationId);
    }
    mappedRow = null;
  }

  if (!mappedRow) {
    const found = await findSheetRowByKey(CUSTOMER_WORK_SHEET, "Application ID", applicationId);
    if (!found.ok) return { ok: false, error: found.error };
    mappedRow = found.rowNumber;
  }

  const workValues = [
    work.workId,
    customer.customerCode,
    entryDate,
    customerName,
    mobile,
    alternateMobile,
    address,
    pincode,
    city,
    district,
    state,
    text(application.service_name) || "Service",
    customerName,
    appliedByType,
    assignedTo,
    teamType,
    dates.workStatus,
    String(paymentFields.totalFee),
    String(paymentFields.amountReceived),
    String(paymentFields.balance),
    paymentFields.paymentStatus,
    dates.nextFollowUp,
    expectedCompletion,
    dates.completedDate,
    invoiceNo,
    invoiceLink,
    paymentId,
    applicationId,
    applicationId,
    whatsappStatus,
    lastUpdated,
    text(options.notes) || text(application.admin_note) || text(application.customer_note) || text(application.notes),
  ];

  // Final Application ID lookup before append — prevents duplicate rows under concurrency.
  if (!mappedRow) {
    const recheck = await findSheetRowByKey(CUSTOMER_WORK_SHEET, "Application ID", applicationId);
    if (!recheck.ok) return { ok: false, error: recheck.error };
    mappedRow = recheck.rowNumber;
  }

  const upserted = await upsertSheetRow({
    sheetName: CUSTOMER_WORK_SHEET,
    headers: CUSTOMER_WORK_HEADERS,
    values: workValues,
    rowNumber: mappedRow,
  });
  if (!upserted.ok) return { ok: false, error: upserted.error };

  let finalRow = upserted.rowNumber;
  if (!finalRow) {
    const found = await findSheetRowByKey(CUSTOMER_WORK_SHEET, "Application ID", applicationId);
    if (found.ok && found.rowNumber) finalRow = found.rowNumber;
  }

  if (finalRow) {
    await supabase.from("crm_sheet_row_map").upsert(
      {
        entity_type: "customer_work",
        entity_key: applicationId,
        sheet_name: CUSTOMER_WORK_SHEET,
        row_number: finalRow,
        spreadsheet_id: loaded.config.spreadsheetId,
        application_id: applicationId,
        customer_id: customer.customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "spreadsheet_id,sheet_name,entity_type,entity_key" },
    );
  }

  const apps = (workStats as { id: string; amount?: number | null; total_amount?: number | null; payment_status?: string | null; created_at?: string | null }[] | null) ?? [];
  const totalWorks = apps.length || 1;
  const lifetimeValue = apps.reduce((sum, row) => {
    const fee = Number(row.total_amount ?? row.amount ?? 0) || 0;
    const paid =
      String(row.payment_status || "").toLowerCase() === "verified" ||
      String(row.payment_status || "").toLowerCase() === "paid"
        ? fee
        : 0;
    return sum + paid;
  }, paymentFields.paymentStatus === "Paid" && apps.length === 0 ? paymentFields.amountReceived : 0);

  const lastVisit =
    apps
      .map((row) => String(row.created_at || "").slice(0, 10))
      .filter(Boolean)
      .sort()
      .at(-1) || entryDate;

  const master = await upsertCustomerMasterRow({
    customerCode: customer.customerCode,
    name: customerName,
    mobile,
    address,
    city,
    district,
    state,
    totalWorks,
    lifetimeValue: Math.round(lifetimeValue * 100) / 100 || paymentFields.amountReceived,
    lastVisit,
    customerId: customer.customerId,
  });
  if (!master.ok) {
    console.warn("[workSync] customer_master_upsert_failed", { applicationId, error: master.error });
  }

  return { ok: true, workId: work.workId, customerCode: customer.customerCode };
}
