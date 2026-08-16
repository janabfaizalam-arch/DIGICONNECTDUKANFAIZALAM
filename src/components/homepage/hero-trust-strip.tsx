import { Building2, Landmark, Lock, Receipt, ShieldCheck } from "lucide-react";

/**
 * What DigiConnect Dukan actually covers.
 *
 * These are service categories that exist in the catalogue, not press logos or
 * awards: a private documentation-assistance company has no business borrowing
 * a publication's credibility, and an unsupported claim on the busiest page of
 * the site is the kind of thing a customer is right to distrust.
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
    <div className="w-full border-t border-white/15 pt-5">
      <p className="text-center text-[10.5px] font-black uppercase tracking-[0.2em] text-white/50">
        Trusted for
      </p>
      <ul className="no-scrollbar mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 sm:gap-x-8">
        {TRUST_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-center gap-2 text-[12px] font-bold text-white/75 sm:text-[13px]">
              <Icon className="h-4 w-4 shrink-0 text-[var(--dc-orange-400)]" aria-hidden="true" />
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
