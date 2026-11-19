import {
  assessPaymentHealth,
  type PaymentHealthVerdict,
} from "@/lib/admin/payment-diagnostics-core";
import { getRazorpayKeyId, getRazorpayKeySecret } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type StuckPayment = {
  paymentId: string | null;
  orderId: string | null;
  amount: number;
  razorpayStatus: string | null;
  serviceName: string | null;
  paidAt: string | null;
};

export type PaymentDiagnostics = {
  config: {
    keyId: string | null;
    keySecretConfigured: boolean;
    webhookSecretConfigured: boolean;
    mode: "live" | "test" | "unknown";
    environment: string;
    webhookUrl: string;
  };
  activity: {
    lastWebhookAt: string | null;
    recentOrdersStarted: number;
    recentPaymentsCaptured: number;
    recentPaymentsFailed: number;
  };
  gaps: {
    stuckAuthorized: number;
    paidMissingInvoice: number;
    paidMissingWalletDebit: number;
    paidMissingCashback: number;
  };
  stuckPayments: StuckPayment[];
  health: PaymentHealthVerdict;
  loadError: string | null;
};

function modeOf(keyId: string | null): "live" | "test" | "unknown" {
  if (!keyId) return "unknown";
  if (keyId.startsWith("rzp_live")) return "live";
  if (keyId.startsWith("rzp_test")) return "test";
  return "unknown";
}

async function countRows(
  build: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count } = await build();
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Everything the payments diagnostics screen shows.
 *
 * The counts are deliberately cheap head-only queries: this page is opened when
 * something looks wrong, and it should answer fast rather than scan the table.
 */
export async function loadPaymentDiagnostics(): Promise<PaymentDiagnostics> {
  const keyId = getRazorpayKeyId() || null;
  const config = {
    keyId,
    keySecretConfigured: Boolean(getRazorpayKeySecret()),
    webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
    mode: modeOf(keyId),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in"}/api/razorpay/webhook`,
  };

  const supabase = getSupabaseAdmin();

  const empty: PaymentDiagnostics = {
    config,
    activity: { lastWebhookAt: null, recentOrdersStarted: 0, recentPaymentsCaptured: 0, recentPaymentsFailed: 0 },
    gaps: { stuckAuthorized: 0, paidMissingInvoice: 0, paidMissingWalletDebit: 0, paidMissingCashback: 0 },
    stuckPayments: [],
    health: assessPaymentHealth({
      keyId: config.keyId,
      keySecretConfigured: config.keySecretConfigured,
      webhookSecretConfigured: config.webhookSecretConfigured,
      lastWebhookAt: null,
      stuckAuthorized: 0,
      recentOrdersStarted: 0,
      recentPaymentsCaptured: 0,
      paidMissingInvoice: 0,
      paidMissingWalletDebit: 0,
      paidMissingCashback: 0,
    }),
    loadError: null,
  };

  if (!supabase) {
    return { ...empty, loadError: "Supabase service role key is missing, so payment records cannot be read." };
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  try {
    /*
      payment_method is written only by the webhook handler, so the newest row
      carrying one is proof of the last delivery Razorpay actually made to us.
    */
    const [lastWebhookRes, stuckRes] = await Promise.all([
      supabase
        .from("payments")
        .select("updated_at")
        .not("payment_method", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("razorpay_payment_id, razorpay_order_id, amount, razorpay_status, paid_at, applications(service_name)")
        .eq("razorpay_status", "authorized")
        .order("paid_at", { ascending: false })
        .limit(20),
    ]);

    const [recentOrdersStarted, recentPaymentsCaptured, recentPaymentsFailed, stuckAuthorized] = await Promise.all([
      countRows(() =>
        supabase.from("payments").select("id", { count: "exact", head: true }).gte("created_at", since),
      ),
      countRows(() =>
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("razorpay_status", "captured")
          .gte("created_at", since),
      ),
      countRows(() =>
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("razorpay_status", "failed")
          .gte("created_at", since),
      ),
      countRows(() =>
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("razorpay_status", "authorized"),
      ),
    ]);

    // Settlement gaps: paid work whose side-effects never completed. These are
    // counted with RPC-free queries so the page stays dependency-free.
    const { data: paidRows } = await supabase
      .from("applications")
      .select("id, wallet_redeemed_amount, cashback_eligible_amount")
      .eq("payment_status", "verified")
      .limit(2000);

    const paidIds = (paidRows ?? []).map((row) => row.id as string);
    let paidMissingInvoice = 0;
    let paidMissingWalletDebit = 0;
    let paidMissingCashback = 0;

    if (paidIds.length) {
      const [{ data: invoiceRows }, { data: txnRows }] = await Promise.all([
        supabase.from("invoices").select("application_id").in("application_id", paidIds),
        supabase.from("wallet_transactions").select("application_id, direction").in("application_id", paidIds),
      ]);

      const invoiced = new Set((invoiceRows ?? []).map((row) => row.application_id as string));
      const debited = new Set(
        (txnRows ?? []).filter((row) => row.direction === "debit").map((row) => row.application_id as string),
      );
      const credited = new Set(
        (txnRows ?? []).filter((row) => row.direction === "credit").map((row) => row.application_id as string),
      );

      for (const row of paidRows ?? []) {
        const id = row.id as string;
        if (!invoiced.has(id)) paidMissingInvoice += 1;
        if (Number(row.wallet_redeemed_amount ?? 0) > 0 && !debited.has(id)) paidMissingWalletDebit += 1;
        if (Number(row.cashback_eligible_amount ?? 0) > 0 && !credited.has(id)) paidMissingCashback += 1;
      }
    }

    const lastWebhookAt = (lastWebhookRes.data?.updated_at as string | undefined) ?? null;

    const stuckPayments: StuckPayment[] = ((stuckRes.data ?? []) as Record<string, unknown>[]).map((row) => {
      const application = row.applications as { service_name?: string | null } | null;
      return {
        paymentId: (row.razorpay_payment_id as string | null) ?? null,
        orderId: (row.razorpay_order_id as string | null) ?? null,
        amount: Number(row.amount ?? 0),
        razorpayStatus: (row.razorpay_status as string | null) ?? null,
        serviceName: application?.service_name ?? null,
        paidAt: (row.paid_at as string | null) ?? null,
      };
    });

    const gaps = { stuckAuthorized, paidMissingInvoice, paidMissingWalletDebit, paidMissingCashback };
    const activity = { lastWebhookAt, recentOrdersStarted, recentPaymentsCaptured, recentPaymentsFailed };

    return {
      config,
      activity,
      gaps,
      stuckPayments,
      health: assessPaymentHealth({
        keyId: config.keyId,
        keySecretConfigured: config.keySecretConfigured,
        webhookSecretConfigured: config.webhookSecretConfigured,
        lastWebhookAt,
        stuckAuthorized,
        recentOrdersStarted,
        recentPaymentsCaptured,
        paidMissingInvoice,
        paidMissingWalletDebit,
        paidMissingCashback,
      }),
      loadError: null,
    };
  } catch (error) {
    return {
      ...empty,
      loadError: error instanceof Error ? error.message : "Payment records could not be read.",
    };
  }
}
