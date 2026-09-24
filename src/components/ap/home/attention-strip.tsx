import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, IndianRupee } from "lucide-react";

import type { PartnerAttentionItem, PartnerAttentionSeverity } from "@/lib/ap/home-types";

type AttentionStripProps = {
  items: PartnerAttentionItem[];
};

/**
 * Severity never rides on colour alone — each row carries an icon and a word
 * as well, so it survives colour-blindness, greyscale print and forced-colors.
 */
const SEVERITY = {
  critical: {
    word: "Blocked",
    Icon: AlertTriangle,
    card: "border-[#d1344a]/25 bg-[#fef2f3]",
    chip: "bg-[#d1344a] text-white",
    cta: "bg-[#d1344a] text-white hover:bg-[#b62b3e]",
  },
  warning: {
    word: "To collect",
    Icon: IndianRupee,
    card: "border-[#c98500]/25 bg-[#fef8ec]",
    chip: "bg-[#c98500] text-white",
    cta: "bg-[#c98500] text-white hover:bg-[#a86f00]",
  },
  info: {
    word: "Stalled",
    Icon: Clock,
    card: "border-[#1268e8]/20 bg-[#eff6ff]",
    chip: "bg-[var(--dcp-brand)] text-white",
    cta: "bg-[var(--dcp-brand)] text-white hover:bg-[#0d55c0]",
  },
} satisfies Record<
  PartnerAttentionSeverity,
  { word: string; Icon: typeof AlertTriangle; card: string; chip: string; cta: string }
>;

/**
 * The interrupt: at most three things that want the partner today.
 *
 * Everything here is also in the work queue further down — this is the
 * shortcut, not a second source of truth. When there is nothing wrong the
 * whole strip disappears rather than rendering a cheerful empty state, so its
 * presence alone means "something needs you".
 */
export function AttentionStrip({ items }: AttentionStripProps) {
  if (!items.length) return null;

  return (
    <section aria-label="Needs your attention" className="space-y-2.5">
      <h2 className="dcp-h2">Needs your attention</h2>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const severity = SEVERITY[item.severity];
          const { Icon } = severity;

          return (
            <li
              key={item.id}
              className={`flex flex-col justify-between gap-3 rounded-[18px] border p-3.5 ${severity.card}`}
            >
              <div className="min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severity.chip}`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {severity.word}
                </span>
                <p className="mt-2 text-sm font-bold leading-snug text-[var(--dcp-ink)]">{item.title}</p>
                <p className="mt-1 text-xs font-medium leading-snug text-[var(--dcp-ink-2)]">{item.detail}</p>
              </div>

              <Link
                href={item.href}
                className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-ink)] focus-visible:ring-offset-2 ${severity.cta}`}
              >
                {item.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
