"use client";

import Link from "next/link";
import { m } from "framer-motion";
import { ArrowRight, Check, Plus } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { formatINR } from "@/components/apply/shared";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 6 — done.
 *
 * The reference numbers are the point of this screen: they are what a
 * customer quotes when they ring up, so they are large, selectable, and above
 * everything else. What happens next is stated plainly, because "submitted"
 * on its own leaves someone wondering whether they still have to do something.
 */
export function StepDone({ flow }: { flow: Flow }) {
  const { successDetails } = flow;
  if (!successDetails) return null;

  const count = successDetails.applicationIds.length;

  return (
    <div className="space-y-5">
      <PortalCard className="text-center">
        <m.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(155deg,#34d399,#059669)" }}
          aria-hidden="true"
        >
          <Check className="h-8 w-8 stroke-[2.6]" />
        </m.span>

        <h2 className="mt-4 text-[1.4rem] font-extrabold tracking-[-0.02em] text-[var(--dc-ink)]">
          That is with us now
        </h2>
        <p className="mx-auto mt-1.5 max-w-[36ch] text-[13.5px] font-semibold text-[var(--dc-ink)]/60">
          {count === 1 ? "One application" : `${count} applications`} filed for {successDetails.customerName}.
          Our team picks it up from here and you will get an update on every step.
        </p>

        {successDetails.amountPaid > 0 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-extrabold text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {formatINR(successDetails.amountPaid)} paid
          </p>
        ) : null}
      </PortalCard>

      <PortalCard>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
          {count === 1 ? "Your reference number" : "Your reference numbers"}
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {successDetails.applicationIds.map((id) => (
            <li
              key={id}
              className="select-all break-all rounded-xl bg-[var(--dc-blue-soft)] px-3 py-2.5 font-mono text-[13.5px] font-bold text-[var(--dc-blue-mid)]"
            >
              {id}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12px] font-semibold text-[var(--dc-ink)]/50">
          Quote this if you contact us. It is also on your dashboard.
        </p>
      </PortalCard>

      <PortalCard>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
          What you asked for
        </p>
        <p className="mt-1.5 text-[13.5px] font-bold text-[var(--dc-ink)]/75">{successDetails.serviceTitle}</p>
      </PortalCard>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Link
          href="/customer/dashboard"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-extrabold text-white transition duration-300 hover:brightness-110 active:scale-95"
          style={{ background: "var(--dc-grad-blue)" }}
        >
          Track it on my dashboard
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {/*
          A full navigation, not a `Link`.

          From /apply the router would treat a link to /apply as going nowhere
          and leave the finished flow on screen; from /apply/[slug] it would
          carry the same service through. Either way the customer asked to
          start again, so the flow is torn down and rebuilt from the picker.
        */}
        <button
          type="button"
          onClick={() => window.location.assign("/apply")}
          className="lg-pill lg-raise inline-flex min-h-12 items-center justify-center gap-2 px-4 text-[14px] font-extrabold text-[var(--dc-blue-mid)]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Apply for something else
        </button>
      </div>
    </div>
  );
}
