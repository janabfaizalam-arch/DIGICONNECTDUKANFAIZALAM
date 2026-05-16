import { getRazorpayClient } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

type RazorpayPayment = {
  id: string;
  order_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  method?: string | null;
  email?: string | null;
  contact?: string | null;
  created_at?: number | null;
  notes?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type ApplicationMatch = {
  id: string;
  user_id: string | null;
  customer_id?: string | null;
  amount: number | null;
  total_amount?: number | null;
  fresh_payable_amount?: number | null;
  real_payment_amount?: number | null;
  wallet_redeemed_amount?: number | null;
  wallet_used_amount?: number | null;
  status: string | null;
  payment_status: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
};

type PaymentMatch = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  amount: number | null;
  real_payment_amount?: number | null;
  wallet_used_amount?: number | null;
  status: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
};

export type ReconciliationRow = {
  id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string | null;
  amount: number;
  currency: string;
  razorpay_status: string;
  payment_method: string | null;
  email: string | null;
  contact: string | null;
  paid_at: string | null;
  last_seen_at: string;
  resolved_at: string | null;
  matched_application_id: string | null;
  matched_payment_id: string | null;
  action_needed: string;
};

export type ReconciliationLogRow = {
  id: string;
  action: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  application_id: string | null;
  payment_id: string | null;
  created_at: string;
};

export type ReconciliationSummary = {
  unmatchedCount: number;
  warningCount: number;
  recentLogs: ReconciliationLogRow[];
};

export type SyncResult = {
  scanned: number;
  matchedApplications: number;
  matchedPayments: number;
  createdPayments: number;
  markedApplicationsPaid: number;
  unmatched: number;
};

function isRecoverableRazorpayStatus(status: string | null | undefined) {
  return status === "captured" || status === "authorized";
}

function paymentStatusFromRazorpay(status: string | null | undefined) {
  if (status === "captured" || status === "authorized") return "verified";
  if (status === "failed") return "failed";
  return "pending";
}

function amountFromPaise(amount: unknown) {
  const paise = Number(amount ?? 0);
  return Number.isFinite(paise) ? paise / 100 : 0;
}

function isoFromRazorpayCreatedAt(createdAt: unknown) {
  const seconds = Number(createdAt ?? 0);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function normalizeDateRange(from?: string | null, to?: string | null) {
  const now = new Date();
  const fallbackFrom = new Date(now);
  fallbackFrom.setDate(now.getDate() - 7);
  const fromDate = from ? new Date(from) : fallbackFrom;
  const toDate = to ? new Date(to) : now;
  const safeFrom = Number.isFinite(fromDate.getTime()) ? fromDate : fallbackFrom;
  const safeTo = Number.isFinite(toDate.getTime()) ? toDate : now;
  const maxRangeMs = 45 * 24 * 60 * 60 * 1000;

  if (safeTo.getTime() - safeFrom.getTime() > maxRangeMs) {
    safeFrom.setTime(safeTo.getTime() - maxRangeMs);
  }

  return {
    from: Math.floor(safeFrom.getTime() / 1000),
    to: Math.floor(safeTo.getTime() / 1000),
    fromIso: safeFrom.toISOString(),
    toIso: safeTo.toISOString(),
  };
}

async function logReconciliation(
  supabase: SupabaseAdmin,
  input: {
    action: string;
    adminUserId: string | null;
    payment: Pick<RazorpayPayment, "id" | "order_id">;
    applicationId?: string | null;
    paymentId?: string | null;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
) {
  await supabase.from("razorpay_reconciliation_logs").insert({
    action: input.action,
    admin_user_id: input.adminUserId,
    razorpay_payment_id: input.payment.id,
    razorpay_order_id: input.payment.order_id ?? null,
    application_id: input.applicationId ?? null,
    payment_id: input.paymentId ?? null,
    before_metadata: input.before ?? {},
    after_metadata: input.after ?? {},
  });
}

async function findMatches(supabase: SupabaseAdmin, payment: RazorpayPayment) {
  const paymentId = payment.id;
  const orderId = payment.order_id ?? "";
  const applicationFilter = orderId
    ? `razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId}`
    : `razorpay_payment_id.eq.${paymentId}`;
  const paymentFilter = orderId
    ? `razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId}`
    : `razorpay_payment_id.eq.${paymentId}`;

  const [applicationResult, paymentResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, user_id, customer_id, amount, total_amount, fresh_payable_amount, real_payment_amount, wallet_redeemed_amount, wallet_used_amount, status, payment_status, razorpay_order_id, razorpay_payment_id")
      .or(applicationFilter)
      .limit(5),
    supabase
      .from("payments")
      .select("id, application_id, user_id, amount, real_payment_amount, wallet_used_amount, status, razorpay_order_id, razorpay_payment_id")
      .or(paymentFilter)
      .limit(5),
  ]);

  const applications = (applicationResult.data ?? []) as ApplicationMatch[];
  const payments = (paymentResult.data ?? []) as PaymentMatch[];
  const paymentApplicationIds = payments.map((row) => row.application_id).filter(Boolean) as string[];

  if (!applications.length && paymentApplicationIds.length) {
    const { data } = await supabase
      .from("applications")
      .select("id, user_id, customer_id, amount, total_amount, fresh_payable_amount, real_payment_amount, wallet_redeemed_amount, wallet_used_amount, status, payment_status, razorpay_order_id, razorpay_payment_id")
      .in("id", paymentApplicationIds)
      .limit(5);

    applications.push(...((data ?? []) as ApplicationMatch[]));
  }

  return {
    application: applications[0] ?? null,
    applications,
    payment: payments[0] ?? null,
  };
}

function buildPaymentPayload(payment: RazorpayPayment, application: ApplicationMatch) {
  const amount = amountFromPaise(payment.amount);
  const paidAt = isoFromRazorpayCreatedAt(payment.created_at);

  return {
    application_id: application.id,
    user_id: application.user_id,
    amount,
    wallet_used_amount: Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0),
    real_payment_amount: amount,
    status: paymentStatusFromRazorpay(payment.status),
    razorpay_order_id: payment.order_id ?? application.razorpay_order_id ?? null,
    razorpay_payment_id: payment.id,
    razorpay_status: payment.status ?? null,
    payment_method: payment.method ?? null,
    paid_at: isRecoverableRazorpayStatus(payment.status) ? paidAt : null,
    updated_at: new Date().toISOString(),
  };
}

async function createMissingPaymentRow(supabase: SupabaseAdmin, payment: RazorpayPayment, application: ApplicationMatch) {
  if (!application.user_id) {
    return null;
  }

  const payload = buildPaymentPayload(payment, application);
  const { data, error } = await supabase.from("payments").insert(payload).select("id").single();

  if (error) {
    console.error("[razorpay-reconciliation] Missing payment row creation failed", {
      paymentId: payment.id,
      applicationId: application.id,
      error,
    });
    return null;
  }

  return data as { id: string };
}

async function markApplicationPaid(supabase: SupabaseAdmin, payment: RazorpayPayment, application: ApplicationMatch) {
  const paidAt = isoFromRazorpayCreatedAt(payment.created_at);
  const nextStatus = application.status === "payment_pending" ? "submitted" : application.status || "submitted";
  const updatePayload = {
    status: nextStatus,
    payment_status: "verified",
    razorpay_order_id: payment.order_id ?? application.razorpay_order_id ?? null,
    razorpay_payment_id: payment.id,
    paid_at: paidAt,
    submitted_at: application.status === "payment_pending" ? paidAt : undefined,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("applications").update(updatePayload).eq("id", application.id);

  if (error) {
    console.error("[razorpay-reconciliation] Application mark paid failed", {
      paymentId: payment.id,
      applicationId: application.id,
      error,
    });
    return false;
  }

  await supabase.from("invoices").update({ payment_status: "verified" }).eq("application_id", application.id);
  return true;
}

async function upsertUnmatchedPayment(supabase: SupabaseAdmin, payment: RazorpayPayment) {
  const payload = {
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id ?? null,
    amount: amountFromPaise(payment.amount),
    currency: payment.currency ?? "INR",
    razorpay_status: payment.status ?? "unknown",
    payment_method: payment.method ?? null,
    email: payment.email ?? null,
    contact: payment.contact ?? null,
    paid_at: isoFromRazorpayCreatedAt(payment.created_at),
    last_seen_at: new Date().toISOString(),
    metadata: payment,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("unmatched_razorpay_payments").upsert(payload, {
    onConflict: "razorpay_payment_id",
  });
}

async function markUnmatchedResolved(
  supabase: SupabaseAdmin,
  payment: RazorpayPayment,
  adminUserId: string | null,
  applicationId: string | null,
  paymentId: string | null,
  note: string,
) {
  await supabase
    .from("unmatched_razorpay_payments")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: adminUserId,
      resolved_application_id: applicationId,
      resolved_payment_id: paymentId,
      resolution_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_payment_id", payment.id);
}

export async function syncRazorpayPayments(input: {
  from?: string | null;
  to?: string | null;
  adminUserId: string | null;
}): Promise<SyncResult> {
  const razorpay = getRazorpayClient();
  const supabase = getSupabaseAdmin();

  if (!razorpay) {
    throw new Error("Razorpay is not configured on the server.");
  }

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const range = normalizeDateRange(input.from, input.to);
  const result: SyncResult = {
    scanned: 0,
    matchedApplications: 0,
    matchedPayments: 0,
    createdPayments: 0,
    markedApplicationsPaid: 0,
    unmatched: 0,
  };
  const count = 100;
  let skip = 0;

  while (skip < 1000) {
    const response = await razorpay.payments.all({
      from: range.from,
      to: range.to,
      count,
      skip,
    });
    const payments = (((response as unknown as { items?: unknown[] }).items ?? []) as unknown) as RazorpayPayment[];

    if (!payments.length) break;

    for (const payment of payments) {
      if (!payment.id || !isRecoverableRazorpayStatus(payment.status)) continue;

      result.scanned += 1;
      const before = { payment, dateRange: { from: range.fromIso, to: range.toIso } };
      const matches = await findMatches(supabase, payment);

      if (matches.application) result.matchedApplications += matches.applications.length || 1;
      if (matches.payment) result.matchedPayments += 1;

      let paymentRow = matches.payment;

      if (matches.application && !paymentRow) {
        const inserted = await createMissingPaymentRow(supabase, payment, matches.application);
        if (inserted) {
          result.createdPayments += 1;
          paymentRow = {
            id: inserted.id,
            application_id: matches.application.id,
            user_id: matches.application.user_id,
            amount: amountFromPaise(payment.amount),
            status: "verified",
            razorpay_order_id: payment.order_id ?? null,
            razorpay_payment_id: payment.id,
          };
          await logReconciliation(supabase, {
            action: "create_missing_payment_row",
            adminUserId: input.adminUserId,
            payment,
            applicationId: matches.application.id,
            paymentId: inserted.id,
            before,
            after: { insertedPaymentId: inserted.id },
          });
        }
      } else if (matches.payment && matches.payment.status !== "verified") {
        await supabase
          .from("payments")
          .update({
            status: "verified",
            razorpay_status: payment.status ?? null,
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id ?? matches.payment.razorpay_order_id ?? null,
            payment_method: payment.method ?? null,
            paid_at: isoFromRazorpayCreatedAt(payment.created_at),
            updated_at: new Date().toISOString(),
          })
          .eq("id", matches.payment.id);
      }

      if (matches.application) {
        for (const application of matches.applications.length ? matches.applications : [matches.application]) {
          if (application.payment_status === "verified") continue;

          const marked = await markApplicationPaid(supabase, payment, application);
          if (marked) {
            result.markedApplicationsPaid += 1;
            await logReconciliation(supabase, {
              action: "mark_application_paid",
              adminUserId: input.adminUserId,
              payment,
              applicationId: application.id,
              paymentId: paymentRow?.id ?? null,
              before: { application },
              after: { payment_status: "verified", status: application.status === "payment_pending" ? "submitted" : application.status },
            });
          }
        }
      }

      if (matches.application) {
        await markUnmatchedResolved(supabase, payment, input.adminUserId, matches.application.id, paymentRow?.id ?? null, "Matched during Razorpay sync.");
      } else {
        result.unmatched += 1;
        await upsertUnmatchedPayment(supabase, payment);
        await logReconciliation(supabase, {
          action: "record_unmatched_razorpay_payment",
          adminUserId: input.adminUserId,
          payment,
          before,
          after: { action_needed: "manual_application_link_or_create" },
        });
      }
    }

    if (payments.length < count) break;
    skip += count;
  }

  return result;
}

export async function getPaymentReconciliationRows(limit = 100): Promise<ReconciliationRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("unmatched_razorpay_payments")
    .select("id, razorpay_payment_id, razorpay_order_id, amount, currency, razorpay_status, payment_method, email, contact, paid_at, last_seen_at, resolved_at, resolved_application_id, resolved_payment_id")
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[razorpay-reconciliation] Rows unavailable", error);
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    razorpay_payment_id: String(row.razorpay_payment_id ?? ""),
    razorpay_order_id: row.razorpay_order_id ? String(row.razorpay_order_id) : null,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "INR"),
    razorpay_status: String(row.razorpay_status ?? "unknown"),
    payment_method: row.payment_method ? String(row.payment_method) : null,
    email: row.email ? String(row.email) : null,
    contact: row.contact ? String(row.contact) : null,
    paid_at: row.paid_at ? String(row.paid_at) : null,
    last_seen_at: String(row.last_seen_at ?? ""),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
    matched_application_id: row.resolved_application_id ? String(row.resolved_application_id) : null,
    matched_payment_id: row.resolved_payment_id ? String(row.resolved_payment_id) : null,
    action_needed: row.resolved_at ? "Resolved" : "Link to application or create real application manually",
  }));
}

export async function getPaymentReconciliationSummary(): Promise<ReconciliationSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { unmatchedCount: 0, warningCount: 0, recentLogs: [] };

  const [unmatchedResult, diagnosticsResult, logsResult] = await Promise.all([
    supabase.from("unmatched_razorpay_payments").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("admin_crm_diagnostics").select("id", { count: "exact", head: true }),
    supabase
      .from("razorpay_reconciliation_logs")
      .select("id, action, razorpay_payment_id, razorpay_order_id, application_id, payment_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    unmatchedCount: unmatchedResult.count ?? 0,
    warningCount: diagnosticsResult.count ?? 0,
    recentLogs: (logsResult.data ?? []) as ReconciliationLogRow[],
  };
}

export async function reconcilePaymentAction(input: {
  action: "link_to_application" | "mark_application_paid" | "create_missing_payment_row" | "mark_stale_pending_failed";
  adminUserId: string | null;
  razorpayPaymentId?: string | null;
  applicationId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase service role key is missing.");

  const applicationId = String(input.applicationId ?? "").trim();
  const razorpayPaymentId = String(input.razorpayPaymentId ?? "").trim();

  if (input.action === "mark_stale_pending_failed") {
    if (!applicationId) throw new Error("Application id is required.");
    const { data: before } = await supabase.from("applications").select("id, status, payment_status").eq("id", applicationId).maybeSingle();

    await supabase
      .from("applications")
      .update({ status: "payment_failed", payment_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .eq("status", "payment_pending");
    await supabase
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("application_id", applicationId)
      .eq("status", "pending");
    await logReconciliation(supabase, {
      action: input.action,
      adminUserId: input.adminUserId,
      payment: { id: razorpayPaymentId || "manual", order_id: null },
      applicationId,
      before: { application: before },
      after: { status: "payment_failed", payment_status: "failed" },
    });

    return { success: true };
  }

  if (!razorpayPaymentId) throw new Error("Razorpay payment id is required.");

  const { data: unmatched } = await supabase
    .from("unmatched_razorpay_payments")
    .select("*")
    .eq("razorpay_payment_id", razorpayPaymentId)
    .maybeSingle();

  if (!unmatched) throw new Error("Unmatched Razorpay payment was not found. Run sync again.");

  const payment = {
    id: String(unmatched.razorpay_payment_id),
    order_id: unmatched.razorpay_order_id ? String(unmatched.razorpay_order_id) : null,
    amount: Number(unmatched.amount ?? 0) * 100,
    currency: String(unmatched.currency ?? "INR"),
    status: String(unmatched.razorpay_status ?? "captured"),
    method: unmatched.payment_method ? String(unmatched.payment_method) : null,
    email: unmatched.email ? String(unmatched.email) : null,
    contact: unmatched.contact ? String(unmatched.contact) : null,
    created_at: unmatched.paid_at ? Math.floor(new Date(String(unmatched.paid_at)).getTime() / 1000) : Math.floor(Date.now() / 1000),
    notes: (unmatched.metadata as RazorpayPayment | null)?.notes ?? null,
  } satisfies RazorpayPayment;

  if (!applicationId) throw new Error("Application id is required.");

  const { data: application } = await supabase
    .from("applications")
    .select("id, user_id, customer_id, amount, total_amount, fresh_payable_amount, real_payment_amount, wallet_redeemed_amount, wallet_used_amount, status, payment_status, razorpay_order_id, razorpay_payment_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) throw new Error("Application was not found.");

  const app = application as ApplicationMatch;
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, application_id, user_id, amount, real_payment_amount, wallet_used_amount, status, razorpay_order_id, razorpay_payment_id")
    .or(`razorpay_payment_id.eq.${payment.id},application_id.eq.${app.id}`)
    .maybeSingle();

  let paymentId = (existingPayment as PaymentMatch | null)?.id ?? null;

  if (input.action === "link_to_application" || input.action === "create_missing_payment_row") {
    if (!paymentId) {
      const inserted = await createMissingPaymentRow(supabase, payment, app);
      paymentId = inserted?.id ?? null;
    } else {
      await supabase
        .from("payments")
        .update({
          application_id: app.id,
          user_id: app.user_id,
          status: "verified",
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          razorpay_status: payment.status,
          payment_method: payment.method,
          paid_at: isoFromRazorpayCreatedAt(payment.created_at),
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
    }
  }

  if (input.action === "link_to_application" || input.action === "mark_application_paid") {
    await markApplicationPaid(supabase, payment, app);
  }

  await markUnmatchedResolved(supabase, payment, input.adminUserId, app.id, paymentId, `Admin action: ${input.action}`);
  await logReconciliation(supabase, {
    action: input.action,
    adminUserId: input.adminUserId,
    payment,
    applicationId: app.id,
    paymentId,
    before: { unmatched, application, existingPayment },
    after: { resolved: true, application_id: app.id, payment_id: paymentId },
  });

  return { success: true };
}
