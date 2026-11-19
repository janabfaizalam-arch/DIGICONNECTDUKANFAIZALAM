/**
 * Completion for the two paid flows that do not live in `applications`:
 * credit reports and print jobs.
 *
 * Both were finished only by the browser calling their verify route on the way
 * back from Razorpay. A customer who closed the tab after paying left a credit
 * report stuck on `payment_pending` with the bureau never called, or a print job
 * that never queued -- money taken, nothing delivered. The webhook now completes
 * them as well.
 */

import { processCreditScoreCheck } from "@/lib/credit/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Outcome = { handled: boolean; reason?: string };

/** Statuses a credit report may be claimed from; anything later is running or done. */
const CLAIMABLE_CREDIT_STATUSES = ["payment_pending", "payment_verified", "failed"];

/**
 * Claim a credit report for score fetching with a conditional update, so the
 * webhook and the browser's verify call can never both run the bureau request
 * for one payment -- it is billed per call. Only the winner gets the row back.
 */
export async function claimCreditReportForProcessing(creditReportId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("credit_reports")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", creditReportId)
    .in("status", CLAIMABLE_CREDIT_STATUSES)
    .select("id, customer_id")
    .maybeSingle();

  return (data as { id: string; customer_id: string | null } | null) ?? null;
}

export async function completeCreditPayment(input: {
  orderId: string;
  paymentId: string;
  source: "webhook" | "verify";
}): Promise<Outcome> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { handled: false, reason: "supabase_unavailable" };

  const { data: report } = await supabase
    .from("credit_reports")
    .select("id, customer_id, status")
    .eq("razorpay_order_id", input.orderId)
    .maybeSingle();

  if (!report?.id) {
    return { handled: false, reason: "no_credit_report" };
  }

  const reportId = report.id as string;

  await supabase
    .from("credit_payments")
    .update({
      status: "verified",
      razorpay_payment_id: input.paymentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("credit_report_id", reportId)
    .neq("status", "verified");

  await supabase
    .from("credit_reports")
    .update({ razorpay_payment_id: input.paymentId, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  const claimed = await claimCreditReportForProcessing(reportId);

  if (!claimed) {
    // Someone already took it: the score fetch is running or has finished.
    return { handled: true, reason: "already_processing" };
  }

  try {
    await processCreditScoreCheck(reportId, String(claimed.customer_id ?? report.customer_id ?? ""));
    console.info(`[payments/credit:${input.source}] score_fetched`, JSON.stringify({ reportId, paymentId: input.paymentId }));
  } catch (error) {
    console.error(`[payments/credit:${input.source}] score_fetch_failed`, {
      reportId,
      paymentId: input.paymentId,
      error: error instanceof Error ? error.message : error,
    });
    await supabase
      .from("credit_reports")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", reportId);
  }

  return { handled: true };
}

export async function completePrintPayment(input: {
  orderId: string;
  paymentId: string;
  paidAt: string;
  source: "webhook" | "verify";
}): Promise<Outcome> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { handled: false, reason: "supabase_unavailable" };

  const { data: job } = await supabase
    .from("print_jobs")
    .select("id, job_number, payment_status")
    .eq("razorpay_order_id", input.orderId)
    .maybeSingle();

  if (!job?.id) {
    return { handled: false, reason: "no_print_job" };
  }

  if (job.payment_status === "verified") {
    return { handled: true, reason: "already_verified" };
  }

  const { error } = await supabase
    .from("print_jobs")
    .update({
      payment_status: "verified",
      print_status: "queued",
      razorpay_payment_id: input.paymentId,
      updated_at: input.paidAt,
    })
    .eq("id", job.id)
    .neq("payment_status", "verified");

  if (error) {
    console.error(`[payments/print:${input.source}] job_update_failed`, { jobId: job.id, error });
    return { handled: false, reason: "update_failed" };
  }

  await supabase.from("print_job_logs").insert({
    job_id: job.id,
    action: "payment_verified",
    actor: "system",
    details: {
      source: input.source,
      payment_id: input.paymentId,
      order_id: input.orderId,
      paid_at: input.paidAt,
    },
  });

  return { handled: true };
}
