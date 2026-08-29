"use client";

import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { formatINR } from "@/components/apply/shared";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 5 — payment.
 *
 * The figure is stated once, large, with the line-by-line above it. The old
 * screen called it an "Estimated Total" and then reassured you in small print
 * that the real number would be confirmed later, which reads as a warning
 * that the price might change. It cannot: the server checks the amount
 * against the cart and refuses the payment if they differ. So the total is
 * the total, and the check is described as the safeguard it is.
 */
export function StepPayment({ flow }: { flow: Flow }) {
  const { cartItems, cartTotal, isScriptReady, paymentError } = flow;

  return (
    <div className="space-y-5">

      <PortalCard className="relative isolate overflow-hidden text-white" padded={false}>
        <div className="absolute inset-0 -z-10" style={{ background: "var(--dc-grad-blue)" }} aria-hidden="true" />
        <div className="dc-ambient-layer" aria-hidden="true">
          <div className="dc-jaali absolute inset-0 opacity-[0.08]" />
        </div>

        <div className="relative p-5">
          <ul className="space-y-1.5">
            {cartItems.map((item) => (
              <li key={item.service.slug} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-semibold text-white/70">
                  {item.service.title}
                  {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </span>
                <span className="shrink-0 font-bold text-white/90">
                  {formatINR(item.service.customer_fee * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3.5 flex items-end justify-between border-t border-white/20 pt-3.5">
            <span className="text-[13px] font-bold text-white/70">Amount payable</span>
            <span className="text-[30px] font-extrabold leading-none tracking-[-0.02em]">
              {formatINR(cartTotal)}
            </span>
          </div>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--dc-grad-blue)" }}
            aria-hidden="true"
          >
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-extrabold text-[var(--dc-ink)]">Razorpay secure checkout</p>
            <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--dc-ink)]/55">
              Cards · UPI · Net banking · Wallets
            </p>
          </div>
          {isScriptReady ? (
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Payment gateway ready" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--dc-ink)]/30" aria-label="Loading payment gateway" />
          )}
        </div>

        <p className="mt-3.5 flex items-start gap-2 border-t border-[var(--dc-ink)]/10 pt-3 text-[11.5px] font-semibold text-[var(--dc-ink)]/55">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
          Your card details go straight to Razorpay and never reach us. The amount is checked against your
          basket on our server before the payment is accepted.
        </p>
      </PortalCard>

      {paymentError ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-[13px] font-bold text-rose-700"
        >
          {paymentError}
        </div>
      ) : null}
    </div>
  );
}
