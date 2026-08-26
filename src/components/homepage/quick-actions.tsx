import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutGrid,
  MessageCircle,
  Wallet,
  Printer,
} from "lucide-react";

import { createWhatsappLink } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BrandIcon, HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

/**
 * The five things people come back to do.
 *
 * Only "Expert" carries the flame ramp. The colour used to be a five-way
 * rainbow — teal, blue, orange, violet, cyan — which made the row look like a
 * palette swatch and, worse, made every tile equally loud, so none of them led.
 * One warm tile against four blue ones tells you where to go when you are
 * stuck, which is the actual job of this row.
 */
const ACTIONS = [
  { title: "Track", subtitle: "Application / Order", href: "/track-application", icon: ClipboardList },
  { title: "Services", subtitle: "All services", href: "/services", icon: LayoutGrid },
  { title: "Print", subtitle: "Scan & print", href: "/print", icon: Printer },
  {
    title: "Expert",
    subtitle: "Help & support",
    href: createWhatsappLink(),
    icon: MessageCircle,
    tone: "flame" as const,
    external: true,
  },
  { title: "Wallet", subtitle: "Balance & history", href: "/customer/dashboard?tab=wallet", icon: Wallet },
] as const;

export function QuickActions() {
  return (
    <HomepageSection id="quick-actions" surface="sky" wash="dual" compact eager>
      <HomepageSectionHeader eyebrow="Shortcuts" title="Quick actions" />

      {/* A grid, not a rail.

          Five shortcuts in a horizontal scroller showed one and a half cards
          on a 390px phone, so the other three were invisible unless you knew
          to swipe — and the half-cut second card read as a rendering fault
          rather than an invitation. Two columns fit all five on screen with
          nothing hidden; the last one spans the row so there is no orphan. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const tone = "tone" in action ? action.tone : "blue";
          // The fifth of five would sit alone on a second row of two, so it
          // takes the whole width instead of leaving a hole beside it.
          const last = index === ACTIONS.length - 1;
          const className = cn(
            "lg-card lg-raise lg-sheen group flex min-h-[4.75rem] items-center gap-2.5 px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:gap-3",
            last && "col-span-2 sm:col-span-1",
          );

          const body = (
            <>
              <BrandIcon tone={tone} className="h-10 w-10 sm:h-11 sm:w-11">
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
              </BrandIcon>
              {/* The subtitle used to be sm:block — hidden on exactly the
                  screens where "Track" and "Wallet" most need explaining. */}
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13.5px] font-extrabold leading-tight text-[var(--dc-ink)] sm:text-sm">
                  {action.title}
                </span>
                <span className="mt-0.5 block text-[11.5px] font-medium leading-tight text-[var(--dc-body)] sm:text-[12px]">
                  {action.subtitle}
                </span>
              </span>
              <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[var(--dc-blue-mid)] shadow-sm transition duration-300 group-hover:bg-white group-hover:text-[var(--dc-flame)] sm:flex">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </>
          );

          if ("external" in action && action.external) {
            return (
              <a key={action.title} href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
                {body}
              </a>
            );
          }

          return (
            <Link key={action.title} href={action.href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </HomepageSection>
  );
}
