import {
  Banknote,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  Landmark,
  Megaphone,
  ReceiptText,
} from "lucide-react";

import {
  BENEFIT_KIND_LABEL_HI,
  FREQUENCY_LABEL_HI,
  type BenefitKind,
  type BenefitLine,
} from "@/lib/labour/types";
import { cn } from "@/lib/utils";

/**
 * One payable line, with the kind of money it is stated on its face.
 *
 * The whole reason this component exists rather than a `<li>{amount}</li>` is
 * that "₹25,000" answers nothing on its own. Cash arrives in a bank account;
 * a fixed deposit matures years later and only if a condition holds; a
 * reimbursement needs bills first. Each gets its own icon, its own colour and
 * its own word, so a reader learns the difference once and carries it down the
 * page.
 */

const ICONS: Record<BenefitKind, typeof Banknote> = {
  cash: Banknote,
  fd: Landmark,
  reimbursement: ReceiptText,
  installment: CalendarClock,
  pension: CalendarDays,
  service: GraduationCap,
  awareness: Megaphone,
};

/**
 * One colour per instrument, from the portal's design system.
 *
 * The deposit moved from blue to purple deliberately. Blue was the page's
 * structural colour, which made a fixed deposit read as ordinary — and the one
 * mistake this page exists to prevent is a reader seeing ₹25,000 locked for
 * eighteen years and understanding money in hand.
 */
const TONE: Record<BenefitKind, { chip: string; text: string }> = {
  cash: { chip: "bg-[#ecfdf5] text-[#047857]", text: "text-[#047857]" },
  fd: { chip: "bg-[#f5f3ff] text-[#6d28d9]", text: "text-[#6d28d9]" },
  reimbursement: { chip: "bg-[#f0f9ff] text-[#0369a1]", text: "text-[#0369a1]" },
  installment: { chip: "bg-[#fff7ed] text-[#c2410c]", text: "text-[#c2410c]" },
  pension: { chip: "bg-[#fffbeb] text-[#b45309]", text: "text-[#b45309]" },
  service: { chip: "bg-slate-100 text-slate-700", text: "text-slate-700" },
  awareness: { chip: "bg-[#eef2ff] text-[#4338ca]", text: "text-[#4338ca]" },
};

export function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function BenefitRow({ benefit }: { benefit: BenefitLine }) {
  const Icon = ICONS[benefit.kind];
  const tone = TONE[benefit.kind];

  return (
    <li className="rounded-xl border bg-white p-3.5" style={{ borderColor: "var(--lc-border)" }}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-snug text-[var(--lc-navy)]">{benefit.labelHi || benefit.label}</p>

          <p className={cn("lc-figure mt-1 text-[17px] font-extrabold", tone.text)}>
            {benefit.amount !== null ? formatInr(benefit.amount) : benefit.amountNote}
          </p>
          {benefit.amount !== null && benefit.amountNote ? (
            <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[var(--lc-muted)]">
              {benefit.amountNote}
            </p>
          ) : null}

          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide", tone.chip)}>
              {BENEFIT_KIND_LABEL_HI[benefit.kind]}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
              {FREQUENCY_LABEL_HI[benefit.frequency]}
            </span>
          </p>

          {/*
            Conditions sit here, beside the money — not in a disclaimer at the
            bottom of the page. The 365-day membership and the two-child limit
            are the reasons claims fail, and a reader who scrolls past the
            amount has already made up their mind.
          */}
          {benefit.conditions?.length ? (
            <ul className="mt-1.5 space-y-0.5">
              {benefit.conditions.map((condition) => (
                <li
                  key={condition}
                  className="flex gap-1.5 text-[11.5px] font-semibold leading-snug text-[var(--lc-muted)]"
                >
                  <span aria-hidden="true" className="text-[var(--lc-saffron-deep)]">•</span>
                  {condition}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** The legend, shown once near the top so the icons mean something. */
export function BenefitLegend() {
  const kinds: BenefitKind[] = ["cash", "fd", "reimbursement", "installment", "pension", "service"];
  return (
    <ul className="flex flex-wrap gap-1.5">
      {kinds.map((kind) => {
        const Icon = ICONS[kind];
        return (
          <li
            key={kind}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
              TONE[kind].chip,
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {BENEFIT_KIND_LABEL_HI[kind]}
          </li>
        );
      })}
    </ul>
  );
}
