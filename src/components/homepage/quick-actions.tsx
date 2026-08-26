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
import {
  BrandIcon,
  HomepageSection,
  HomepageSectionHeader,
  HomepageMobileRail,
} from "@/components/homepage/ui";

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

      <HomepageMobileRail className="sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 sm:pr-0">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const tone = "tone" in action ? action.tone : "blue";
          const className =
            "lg-card lg-raise lg-sheen group flex min-h-[4.75rem] w-[74%] max-w-[220px] shrink-0 snap-start items-center gap-3 px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:w-auto sm:max-w-none";

          const body = (
            <>
              <BrandIcon tone={tone}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </BrandIcon>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-extrabold text-[var(--dc-ink)]">{action.title}</span>
                <span className="mt-0.5 hidden text-[12px] font-semibold text-[var(--dc-body)] sm:block">
                  {action.subtitle}
                </span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[var(--dc-blue-mid)] shadow-sm transition duration-300 group-hover:bg-white group-hover:text-[var(--dc-flame)]">
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
      </HomepageMobileRail>
    </HomepageSection>
  );
}
