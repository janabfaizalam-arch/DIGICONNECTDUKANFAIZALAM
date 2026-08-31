"use client";

import { Check, X } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { DOC_SLOTS, formatINR } from "@/components/apply/shared";
import { SummaryRow } from "@/components/apply/ui";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 4 — the last look before money moves.
 *
 * Each panel can be gone back to, and says so: a review screen that shows a
 * mistake but not the way to fix it is worse than no review screen.
 */
export function StepReview({ flow }: { flow: Flow }) {
  const { customer, cartItems, cartTotal, docFiles, setCurrentStep, extraFields, extraValues } = flow;

  return (
    <div className="space-y-5">

      <PortalCard>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
            Services
          </p>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="text-[12px] font-extrabold text-[var(--dc-orange-600)] underline-offset-2 hover:underline"
          >
            Change
          </button>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {cartItems.map((item) => (
            <li key={item.service.slug} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="min-w-0 font-bold text-[var(--dc-ink)]/75">
                {item.service.title}
                {item.quantity > 1 ? <span className="text-[var(--dc-ink)]/40"> ×{item.quantity}</span> : null}
              </span>
              <span className="shrink-0 font-extrabold text-[var(--dc-ink)]">
                {formatINR(item.service.customer_fee * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex items-baseline justify-between border-t border-[var(--dc-ink)]/10 pt-2.5">
          <span className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Total</span>
          <span className="text-[20px] font-extrabold text-[var(--dc-blue-mid)]">{formatINR(cartTotal)}</span>
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
            Your details
          </p>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="text-[12px] font-extrabold text-[var(--dc-orange-600)] underline-offset-2 hover:underline"
          >
            Change
          </button>
        </div>
        <div className="mt-1.5 divide-y divide-[var(--dc-ink)]/[0.07]">
          <SummaryRow label="Name" value={customer.name} />
          <SummaryRow label="Mobile" value={customer.mobile} />
          <SummaryRow
            label="Address"
            value={`${customer.address}, ${customer.city}, ${customer.district}, ${customer.state} — ${customer.pincode}`}
          />
          {/* Whatever this service asked beyond the six, echoed back under the
              question the customer was actually asked. */}
          {extraFields.map((field) => {
            const answer = extraValues[field.id];
            return answer ? <SummaryRow key={field.id} label={field.label} value={answer} /> : null;
          })}
        </div>
      </PortalCard>

      <PortalCard>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
            Documents
          </p>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="text-[12px] font-extrabold text-[var(--dc-orange-600)] underline-offset-2 hover:underline"
          >
            Change
          </button>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {DOC_SLOTS.map((slot) => {
            const file = docFiles[slot.id];
            return (
              <li key={slot.id} className="flex items-center gap-2 text-[13px]">
                {file ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-[var(--dc-ink)]/25" aria-hidden="true" />
                )}
                <span className={file ? "font-bold text-[var(--dc-ink)]/75" : "font-semibold text-[var(--dc-ink)]/45"}>
                  {slot.label}
                  {file ? ` — ${file.name}` : " — not added"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-[11.5px] font-semibold text-[var(--dc-ink)]/50">
          Missing documents do not block this application. We will ask for anything we still need.
        </p>
      </PortalCard>
    </div>
  );
}
