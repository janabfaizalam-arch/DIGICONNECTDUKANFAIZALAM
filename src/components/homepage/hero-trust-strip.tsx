import { Building2, Landmark, Lock, Receipt, ShieldCheck } from "lucide-react";

/**
 * What DigiConnect Dukan actually covers.
 *
 * On a phone this is not rendered: `HomepageTrustChips` sits one screen below
 * and covers the same ground for that width, and stacking both put nine badges
 * into the first two screens of the page.
 *
 * These are service categories that exist in the catalogue, not press logos or
 * awards: a private documentation-assistance company has no business borrowing
 * a publication's credibility, and an unsupported claim on the busiest page of
 * the site is the kind of thing a customer is right to distrust. For the same
 * reason there is no counter here — a number nobody can verify buys less trust
 * than a plain list of what the company does.
 */
const TRUST_ITEMS = [
  { label: "GST & Tax", icon: Receipt },
  { label: "Government Services", icon: Landmark },
  { label: "Business Registration", icon: Building2 },
  { label: "Insurance", icon: ShieldCheck },
  { label: "Secure Payments", icon: Lock },
] as const;

export function HeroTrustStrip() {
  return (
    <div className="w-full">
      {/* The logo sets DUKAN between two short orange rules; the eyebrow here
          borrows that exact device. */}
      <p className="dc-eyebrow-rule text-center text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-white/55">
        Trusted for
      </p>

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <span className="lg-pill-dark inline-flex items-center gap-2 px-3.5 py-2 text-[12px] font-bold text-white/85 sm:text-[13px]">
                <Icon className="h-4 w-4 shrink-0 text-[var(--dc-amber)]" aria-hidden="true" />
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
