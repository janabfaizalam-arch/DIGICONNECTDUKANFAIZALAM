import "server-only";

import {
  daysUntil,
  formatRenewalDue,
  indiaToday,
  normalizeReminderDays,
  pickDueReminder,
  renewalReminderVersion,
} from "@/lib/renewals/renewal-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeAisensyDestination } from "@/lib/whatsapp/aisensy";
import {
  sendApplicationWhatsApp,
  type SendApplicationWhatsAppResult,
} from "@/lib/whatsapp/application-notify";

export type RenewalStatus = "active" | "renewed" | "cancelled";

export type ServiceRenewal = {
  id: string;
  application_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_mobile: string;
  service_name: string;
  reference_number: string | null;
  renewal_date: string;
  reminder_days: number[];
  reminders_sent: number[];
  last_reminder_at: string | null;
  status: RenewalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, application_id, customer_id, customer_name, customer_mobile, service_name, reference_number, renewal_date, reminder_days, reminders_sent, last_reminder_at, status, notes, created_at, updated_at";

function isMissingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && /PGRST205|42P01|does not exist|schema cache/i.test(`${error.code ?? ""} ${error.message ?? ""}`));
}

export type RenewalListResult =
  | { ok: true; renewals: ServiceRenewal[] }
  | { ok: false; upgradeRequired: boolean; error: string };

export async function listRenewals(
  filter: { applicationId?: string; status?: RenewalStatus | "all" } = {},
): Promise<RenewalListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, upgradeRequired: false, error: "Database unavailable." };

  let query = supabase.from("service_renewals").select(COLUMNS).order("renewal_date", { ascending: true }).limit(500);
  if (filter.applicationId) query = query.eq("application_id", filter.applicationId);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      upgradeRequired: isMissingTable(error),
      error: isMissingTable(error) ? "Run the service_renewals migration first." : error.message,
    };
  }
  return { ok: true, renewals: (data ?? []) as ServiceRenewal[] };
}

export type CreateRenewalInput = {
  applicationId: string;
  renewalDate: string;
  referenceNumber?: string | null;
  reminderDays?: number[];
  notes?: string | null;
  customerMobile?: string | null;
  createdBy?: string | null;
};

export async function createRenewal(
  input: CreateRenewalInput,
): Promise<{ ok: true; renewal: ServiceRenewal } | { ok: false; status: number; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Database unavailable." };

  const { data: application } = await supabase
    .from("applications")
    .select("id, customer_id, service_name, customer_mobile, customer_details, form_data")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (!application) return { ok: false, status: 404, error: "Application not found." };

  const details = (application.customer_details ?? {}) as Record<string, unknown>;
  const formData = (application.form_data ?? {}) as Record<string, unknown>;
  const mobile = String(
    input.customerMobile || application.customer_mobile || details.mobile || formData.mobile || "",
  ).trim();
  if (!normalizeAisensyDestination(mobile).ok) {
    return { ok: false, status: 400, error: "A valid WhatsApp mobile number is required for renewal reminders." };
  }

  const { data, error } = await supabase
    .from("service_renewals")
    .insert({
      application_id: application.id,
      customer_id: application.customer_id ?? null,
      customer_name: String(details.name ?? formData.name ?? "Customer").trim() || "Customer",
      customer_mobile: mobile,
      service_name: application.service_name,
      reference_number: input.referenceNumber?.trim() || null,
      renewal_date: input.renewalDate,
      reminder_days: normalizeReminderDays(input.reminderDays),
      notes: input.notes?.trim() || null,
      created_by: input.createdBy ?? null,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    return {
      ok: false,
      status: isMissingTable(error) ? 503 : 500,
      error: isMissingTable(error) ? "Run the service_renewals migration first." : "Renewal could not be saved.",
    };
  }
  return { ok: true, renewal: data as ServiceRenewal };
}

export type UpdateRenewalInput = {
  status?: RenewalStatus;
  renewalDate?: string;
  referenceNumber?: string | null;
  reminderDays?: number[];
  notes?: string | null;
};

export async function updateRenewal(
  id: string,
  input: UpdateRenewalInput,
): Promise<{ ok: true; renewal: ServiceRenewal } | { ok: false; status: number; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Database unavailable." };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status) patch.status = input.status;
  if (input.referenceNumber !== undefined) patch.reference_number = input.referenceNumber?.trim() || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.reminderDays) patch.reminder_days = normalizeReminderDays(input.reminderDays);
  if (input.renewalDate) {
    // A new date is a new cycle (e.g. renewed for another year, or reactivated): its reminders start over.
    patch.renewal_date = input.renewalDate;
    patch.reminders_sent = [];
    if (!input.status) patch.status = "active";
  }

  const { data, error } = await supabase.from("service_renewals").update(patch).eq("id", id).select(COLUMNS).maybeSingle();
  if (error) return { ok: false, status: 500, error: "Renewal could not be updated." };
  if (!data) return { ok: false, status: 404, error: "Renewal not found." };
  return { ok: true, renewal: data as ServiceRenewal };
}

function sendReminder(
  renewal: ServiceRenewal,
  options: { daysLeft: number; version: number; forceRetry?: boolean },
): Promise<SendApplicationWhatsAppResult> {
  return sendApplicationWhatsApp({
    applicationId: renewal.application_id,
    eventType: "renewal_reminder",
    recipientMobile: renewal.customer_mobile,
    customerName: renewal.customer_name,
    serviceName: renewal.service_name,
    customerId: renewal.customer_id,
    renewalDue: formatRenewalDue(renewal.renewal_date, options.daysLeft),
    renewalReference: renewal.reference_number ?? undefined,
    version: options.version,
    forceRetry: options.forceRetry,
  });
}

/** Admin "Send now": one extra reminder outside the schedule. Double clicks within a minute collapse. */
export async function sendRenewalReminderNow(id: string, now: Date = new Date()) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, status: 503, error: "Database unavailable." };

  const { data } = await supabase.from("service_renewals").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) return { ok: false as const, status: 404, error: "Renewal not found." };
  const renewal = data as ServiceRenewal;

  const daysLeft = daysUntil(renewal.renewal_date, indiaToday(now));
  const result = await sendReminder(renewal, {
    daysLeft: Math.max(0, daysLeft),
    version: Math.floor(now.getTime() / 60_000),
  });
  if (result.ok || result.code === "queued") {
    await supabase
      .from("service_renewals")
      .update({ last_reminder_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", id);
  }
  return { ok: true as const, result };
}

export type RenewalRunSummary = {
  today: string;
  checked: number;
  sent: number;
  queued: number;
  skipped: number;
  failed: number;
  upgradeRequired?: boolean;
};

/**
 * Daily job: send every reminder that is due today. Safe to run more than
 * once a day — each (renewal date, stage) has its own idempotency key.
 *
 * A stage is marked handled once the message is sent or sits in the outbox.
 * When WhatsApp is not configured or the provider failed, it is left open
 * and tried again on the next run (still only while the renewal is upcoming).
 */
export async function runRenewalReminders(now: Date = new Date()): Promise<RenewalRunSummary> {
  const today = indiaToday(now);
  const summary: RenewalRunSummary = { today, checked: 0, sent: 0, queued: 0, skipped: 0, failed: 0 };
  const supabase = getSupabaseAdmin();
  if (!supabase) return summary;

  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + 366 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("service_renewals")
    .select(COLUMNS)
    .eq("status", "active")
    .gte("renewal_date", today)
    .lte("renewal_date", horizon)
    .order("renewal_date", { ascending: true })
    .limit(1000);

  if (error) {
    if (isMissingTable(error)) summary.upgradeRequired = true;
    else console.error("[renewals] list_failed", { code: error.code });
    return summary;
  }

  for (const renewal of (data ?? []) as ServiceRenewal[]) {
    summary.checked += 1;
    const due = pickDueReminder({
      renewalDate: renewal.renewal_date,
      today,
      reminderDays: renewal.reminder_days,
      remindersSent: renewal.reminders_sent ?? [],
    });
    if (!due) {
      summary.skipped += 1;
      continue;
    }

    let settle = false;
    try {
      const result = await sendReminder(renewal, {
        daysLeft: due.daysLeft,
        version: renewalReminderVersion(renewal.renewal_date, due.stage),
        forceRetry: true,
      });
      if (result.ok) {
        summary.sent += 1;
        settle = true;
      } else if (result.code === "queued") {
        summary.queued += 1;
        settle = true;
      } else if (result.code === "invalid_mobile") {
        // Nothing to retry until someone fixes the number.
        summary.failed += 1;
        settle = true;
      } else {
        summary.failed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error("[renewals] send_failed", {
        renewalId: renewal.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (settle) {
      const sent = [...new Set([...(renewal.reminders_sent ?? []), ...due.settles])];
      await supabase
        .from("service_renewals")
        .update({ reminders_sent: sent, last_reminder_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", renewal.id);
    }
  }

  return summary;
}
