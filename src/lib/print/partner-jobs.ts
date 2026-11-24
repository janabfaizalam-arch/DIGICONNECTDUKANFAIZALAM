import "server-only";

import { calculateWalletBalance, reversePrintEarning } from "@/lib/ap-wallet";
import { getRazorpayClient } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PrintStation } from "@/lib/print/stations";

/**
 * A partner's own view of their Digi Print counter: the jobs, the takings, and
 * the three things a shop does to a job — let it print, refuse it (the
 * customer is refunded), or print it again.
 *
 * Every function takes the station resolved from the partner's session, never
 * an id from the request, and scopes every query to it.
 */

export type PartnerPrintJob = {
  id: string;
  job_number: string;
  service_type: string;
  paper_size: string;
  color_mode: string;
  copies: number;
  pages: number;
  sheet_count: number;
  price: number;
  partner_earning: number | null;
  payment_status: string;
  print_status: string;
  pickup_pin: string | null;
  customer_mobile: string;
  error_message: string | null;
  created_at: string;
  paid_at: string | null;
};

export type PrintEarnings = {
  today: number;
  month: number;
  total: number;
  jobsToday: number;
  walletBalance: number | null;
};

/** 98******10 — enough for a shop to match a face to an order, no more. */
export function maskMobile(mobile: string): string {
  const digits = String(mobile ?? "");
  return digits.length >= 6 ? `${digits.slice(0, 2)}${"*".repeat(digits.length - 4)}${digits.slice(-2)}` : "***";
}

/** Start of today and of this month, in India time, as ISO strings. */
export function istBoundaries(now = new Date()): { dayStart: string; monthStart: string } {
  const offsetMs = 330 * 60_000;
  const ist = new Date(now.getTime() + offsetMs);
  const day = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - offsetMs;
  const month = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - offsetMs;
  return { dayStart: new Date(day).toISOString(), monthStart: new Date(month).toISOString() };
}

export async function listStationJobs(station: PrintStation, limit = 40): Promise<PartnerPrintJob[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("print_jobs")
    // "*" so a column a migration has not added yet shows as empty, not as
    // an empty job list.
    .select("*")
    .eq("station_id", station.id)
    // Unpaid carts are noise to a shop; only money that moved is shown.
    .in("payment_status", ["verified", "refunded"])
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error) {
    console.error("[print/partner-jobs] list_failed", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    job_number: String(row.job_number ?? ""),
    service_type: String(row.service_type ?? "document"),
    paper_size: String(row.paper_size ?? "A4"),
    color_mode: String(row.color_mode ?? "mono"),
    copies: Number(row.copies ?? 1),
    pages: Number(row.pages ?? 1),
    sheet_count: Number(row.sheet_count ?? 1),
    price: Number(row.price ?? 0),
    partner_earning:
      row.partner_earning === null || row.partner_earning === undefined ? null : Number(row.partner_earning),
    payment_status: String(row.payment_status),
    print_status: String(row.print_status),
    pickup_pin: (row.pickup_pin as string | null) ?? null,
    customer_mobile: maskMobile(String(row.customer_mobile ?? "")),
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at),
    paid_at: (row.paid_at as string | null) ?? null,
  }));
}

export async function stationEarnings(station: PrintStation): Promise<PrintEarnings> {
  const supabase = getSupabaseAdmin();
  const empty: PrintEarnings = { today: 0, month: 0, total: 0, jobsToday: 0, walletBalance: null };
  if (!supabase) return empty;

  const { dayStart, monthStart } = istBoundaries();
  const earnings = { ...empty };

  // Paged: a busy counter outgrows one PostgREST response.
  for (let page = 0; page < 50; page += 1) {
    const from = page * 1000;
    const { data, error } = await supabase
      .from("print_jobs")
      .select("partner_earning, paid_at, created_at")
      .eq("station_id", station.id)
      .eq("payment_status", "verified")
      .not("partner_earning", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + 999);

    if (error) {
      console.error("[print/partner-jobs] earnings_failed", error.message);
      break;
    }
    for (const row of data ?? []) {
      const amount = Number(row.partner_earning ?? 0);
      const at = String(row.paid_at ?? row.created_at ?? "");
      earnings.total += amount;
      if (at >= monthStart) earnings.month += amount;
      if (at >= dayStart) {
        earnings.today += amount;
        earnings.jobsToday += 1;
      }
    }
    if (!data || data.length < 1000) break;
  }

  const balance = await calculateWalletBalance(station.partner_id);
  earnings.walletBalance = balance.ok ? Math.round(balance.balance * 100) / 100 : null;
  earnings.today = Math.round(earnings.today * 100) / 100;
  earnings.month = Math.round(earnings.month * 100) / 100;
  earnings.total = Math.round(earnings.total * 100) / 100;
  return earnings;
}

type ActionResult = { ok: true; message: string } | { ok: false; status: number; error: string };

async function log(jobId: string, action: string, actor: string, details: Record<string, unknown> = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("print_job_logs").insert({ job_id: jobId, action, actor, details });
}

/** Let a job the shop was holding go to the printer. */
export async function approveJob(station: PrintStation, jobId: string, actor: string): Promise<ActionResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Server is not configured." };

  const { data } = await supabase
    .from("print_jobs")
    .update({ print_status: "queued", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("station_id", station.id)
    .eq("payment_status", "verified")
    .eq("print_status", "awaiting_approval")
    .select("id")
    .maybeSingle();

  if (!data) return { ok: false, status: 409, error: "Ye job approve nahi ho sakta — shayad pehle hi ho chuka hai." };
  await log(jobId, "approved", actor);
  return { ok: true, message: "Approved — printer par bhej diya." };
}

/** Print a job again: after a jam, or a customer who wants another go. */
export async function reprintJob(station: PrintStation, jobId: string, actor: string): Promise<ActionResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Server is not configured." };

  // The file may already be gone (auto-delete). Queuing it anyway would only
  // fail at the printer a few seconds later.
  const { data: file } = await supabase.from("print_job_files").select("id").eq("job_id", jobId).limit(1).maybeSingle();
  if (!file) {
    return {
      ok: false,
      status: 409,
      error: "Is job ki file privacy ke liye delete ho chuki hai — customer se dobara upload karwaiye.",
    };
  }

  const { data } = await supabase
    .from("print_jobs")
    .update({
      print_status: "queued",
      claimed_by_agent: null,
      claim_expires_at: null,
      claimed_by: null,
      claimed_at: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("station_id", station.id)
    .eq("payment_status", "verified")
    .in("print_status", ["printed", "failed"])
    .select("id")
    .maybeSingle();

  if (!data) {
    return {
      ok: false,
      status: 409,
      error: "Ye job dobara print nahi ho sakta — file delete ho chuki ho to customer se dobara upload karwaiye.",
    };
  }
  await log(jobId, "reprint_requested", actor);
  return { ok: true, message: "Dobara printer par bhej diya." };
}

/**
 * Refuse a paid job and give the customer their money back.
 *
 * The job is taken out of the printer's reach first (a conditional update only
 * one caller wins), then refunded through Razorpay, then the shop's earning is
 * taken back out of its wallet. If Razorpay refuses the refund the job goes
 * back to where it was, so money is never left nowhere.
 */
export async function rejectAndRefund(
  station: PrintStation,
  jobId: string,
  actor: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Server is not configured." };

  const { data: job } = await supabase
    .from("print_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("station_id", station.id)
    .maybeSingle();

  if (!job) return { ok: false, status: 404, error: "Job nahi mila." };
  if (job.payment_status !== "verified" || !job.razorpay_payment_id) {
    return { ok: false, status: 409, error: "Is job ka payment refund karne layak nahi hai." };
  }

  const previous = String(job.print_status);
  // A job the printer may be holding right now cannot be pulled back.
  const refundable = ["awaiting_approval", "failed", "queued"];
  if (!refundable.includes(previous) || (previous === "queued" && job.claimed_by_agent)) {
    return { ok: false, status: 409, error: "Ye job print ho raha hai ya ho chuka hai — ab refund nahi ho sakta." };
  }

  const { data: taken } = await supabase
    .from("print_jobs")
    .update({ print_status: "cancelled", cancelled_reason: reason.slice(0, 200) || null, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("station_id", station.id)
    .eq("print_status", previous)
    .eq("payment_status", "verified")
    .select("id")
    .maybeSingle();

  if (!taken) return { ok: false, status: 409, error: "Job abhi badal gaya — page refresh kijiye." };

  const razorpay = getRazorpayClient();
  const amountPaise = Math.round(Number(job.price ?? 0) * 100);
  let refundId: string | null = null;

  try {
    if (!razorpay) throw new Error("Razorpay is not configured.");
    const refund = (await razorpay.payments.refund(String(job.razorpay_payment_id), {
      amount: amountPaise,
      notes: { kind: "digi_print_refund", print_job_id: String(job.id) },
    })) as { id?: string };
    refundId = refund?.id ? String(refund.id) : null;
  } catch (error) {
    console.error("[print/partner-jobs] refund_failed", {
      jobId,
      message: error instanceof Error ? error.message : String(error),
    });
    await supabase
      .from("print_jobs")
      .update({ print_status: previous, cancelled_reason: null, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("print_status", "cancelled");
    return { ok: false, status: 502, error: "Refund abhi nahi ho paya. Thodi der baad dobara try kijiye." };
  }

  await supabase
    .from("print_jobs")
    .update({ payment_status: "refunded", razorpay_refund_id: refundId, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (job.partner_earning !== null && job.partner_earning !== undefined && Number(job.partner_earning) > 0) {
    const reversal = await reversePrintEarning({
      agencyPartnerId: station.partner_id,
      printJobId: String(job.id),
      amount: Number(job.partner_earning),
      reason: `Digi Print refund — ${job.job_number}`,
    });
    if (!reversal.ok) {
      console.error("[print/partner-jobs] earning_reversal_failed", { jobId, error: reversal.error });
    }
  }

  await log(jobId, "refunded", actor, { refund_id: refundId, reason, previous_status: previous });
  return { ok: true, message: "Job cancel — customer ko paise wapas bhej diye." };
}

/**
 * Delete the files of this station's finished jobs whose time is up.
 *
 * The customer is told "file N minute me delete", and the only thing that
 * deleted anything was a once-a-day cron with a 24-hour threshold. The
 * station's own poll arrives every few seconds, so it carries the deletion:
 * finished jobs (printed or refunded) past their expires_at lose their file
 * here. Jobs still waiting to print keep theirs; the daily cron remains the
 * backstop for everything else.
 */
export async function purgeExpiredStationFiles(stationId: string, limit = 10): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !stationId) return 0;

  const { data: jobs } = await supabase
    .from("print_jobs")
    .select("id")
    .eq("station_id", stationId)
    .lt("expires_at", new Date().toISOString())
    .in("print_status", ["printed", "cancelled"])
    .limit(50);

  const jobIds = (jobs ?? []).map((job) => String(job.id));
  if (!jobIds.length) return 0;

  const { data: files } = await supabase
    .from("print_job_files")
    .select("id, job_id, storage_path")
    .in("job_id", jobIds)
    .limit(limit);

  let purged = 0;
  for (const file of files ?? []) {
    const { error } = await supabase.storage.from("print-jobs").remove([String(file.storage_path)]);
    if (error) continue;
    await supabase.from("print_job_files").delete().eq("id", file.id);
    await log(String(file.job_id), "file_purged", "system", { reason: "station auto-delete window passed" });
    purged += 1;
  }
  return purged;
}
