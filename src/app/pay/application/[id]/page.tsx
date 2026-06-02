import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { ClientCheckoutWrapper } from "./client-checkout-wrapper";

export const dynamic = "force-dynamic";

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function safeCurrency(amount: unknown): string {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export default async function CustomerPayApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect(`/login/customer?redirect=/pay/application/${id}`);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    notFound();
  }

  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !application) {
    notFound();
  }

  const isAlreadyPaid = application.payment_status === "verified";
  const metadata = application.metadata && typeof application.metadata === "object" ? (application.metadata as Record<string, string | number | boolean | null | undefined>) : {};

  // Pricing math from application record
  const originalPrice = Number(metadata.original_price ?? application.total_amount ?? application.amount ?? 0);
  const couponCode = String(metadata.coupon_code ?? "").trim();
  const couponDiscount = Number(metadata.coupon_discount ?? 0);
  const finalAmount = Number(application.amount ?? 0);
  const walletRedeemed = Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? 0);
  const freshPayable = Number(application.fresh_payable_amount ?? application.real_payment_amount ?? 0);

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0A0F1D] text-slate-100 font-sans flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-indigo-600/20 to-purple-600/0 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-orange-500/10 to-pink-500/0 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto w-full relative z-10 flex-grow flex flex-col justify-center">
        {/* Navigation back link */}
        <div className="mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer Dashboard
          </Link>
        </div>

        {isAlreadyPaid ? (
          /* Payment Already Completed Page */
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md p-8 md:p-10 shadow-[0_12px_40px_rgba(16,185,129,0.05)] text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Payment Completed!</h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-medium">
              We have already verified your secure payment for the application of <strong className="text-white font-semibold">{application.service_name}</strong>.
            </p>

            <div className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-left space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Application ID:</span>
                <span className="font-mono text-slate-200">{application.id}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Service:</span>
                <span className="text-slate-200">{application.service_name}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Status:</span>
                <span className="capitalize text-emerald-400">{application.status}</span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href={`/customer/dashboard`}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Payment Required Page */
          <div className="rounded-3xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-md p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-400">Secure Payment Checkout</p>
                <h1 className="mt-2 text-xl font-extrabold text-white leading-tight">{application.service_name}</h1>
                <p className="mt-1 font-mono text-[10px] text-slate-500">ID: {application.id}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <StatusBadge status={application.status} />
                <PaymentBadge status={application.payment_status} />
              </div>
            </div>

            {/* Applicant Profile Details */}
            <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] grid gap-4 grid-cols-2 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase tracking-wide">Applicant Name</p>
                <p className="mt-1 font-bold text-slate-200">{text(application.customer_details?.name)}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500 uppercase tracking-wide">Mobile Number</p>
                <p className="mt-1 font-bold text-slate-200 font-mono">{text(application.customer_details?.mobile)}</p>
              </div>
            </div>

            {/* Premium Ledger Breakdown */}
            <div className="mt-6 space-y-3.5">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Financial Summary</h2>
              
              <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4.5 space-y-3 text-sm font-semibold">
                <div className="flex justify-between text-slate-400">
                  <span>Application Base Fee</span>
                  <span className="text-slate-200">{safeCurrency(originalPrice)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      Coupon Applied <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-extrabold uppercase text-emerald-400">{couponCode}</span>
                    </span>
                    <span>-{safeCurrency(couponDiscount)}</span>
                  </div>
                )}

                {(couponDiscount > 0) && (
                  <div className="pt-2.5 border-t border-white/[0.04] flex justify-between text-slate-300 font-bold">
                    <span>Discounted Subtotal</span>
                    <span>{safeCurrency(finalAmount)}</span>
                  </div>
                )}

                {walletRedeemed > 0 && (
                  <div className="flex justify-between text-[#818CF8]">
                    <span>Wallet Cashback Redeemed (50%)</span>
                    <span>-{safeCurrency(walletRedeemed)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-white/[0.06] flex justify-between text-white font-extrabold text-base">
                  <span>Fresh Payable Amount</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                    {safeCurrency(freshPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Payments are encrypted and processed securely via Razorpay</span>
            </div>

            {/* Razorpay Button Render */}
            <div className="mt-6">
              <ClientCheckoutWrapper
                applicationId={application.id}
                freshPayableAmount={freshPayable}
                customerName={text(application.customer_details?.name)}
                customerEmail={text(application.customer_details?.email)}
                customerMobile={text(application.customer_details?.mobile)}
                serviceSlug={application.service_slug}
                walletUseAmount={walletRedeemed}
                couponCode={couponCode}
              />
            </div>
          </div>
        )}
      </div>

      <div className="text-center mt-12 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        © 2026 DigiConnect Dukan · Powered by Advanced Agentic Operations
      </div>
    </main>
  );
}
