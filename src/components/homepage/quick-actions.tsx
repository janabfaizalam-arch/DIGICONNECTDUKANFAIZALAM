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
import { HomepageSection, HomepageSectionHeader, HomepageMobileRail } from "@/components/homepage/ui";

const actions = [
  {
    title: "Track",
    subtitle: "Application / Order",
    href: "/track-application",
    icon: ClipboardList,
    tone: "bg-[var(--dc-teal-soft)] text-[var(--dc-teal)] border-[var(--dc-teal)]/15",
    iconTone: "bg-[var(--dc-teal)] text-white",
  },
  {
    title: "Services",
    subtitle: "All services",
    href: "/services",
    icon: LayoutGrid,
    tone: "bg-[var(--dc-blue-soft)] text-[var(--dc-blue-700)] border-[var(--dc-blue-500)]/15",
    iconTone: "bg-[var(--dc-blue-700)] text-white",
  },
  {
    title: "Print",
    subtitle: "Scan & print",
    href: "/print",
    icon: Printer,
    tone: "bg-[var(--dc-orange-soft)] text-[var(--dc-orange-600)] border-[var(--dc-orange-500)]/20",
    iconTone: "bg-[var(--dc-orange-500)] text-white",
  },
  {
    title: "Expert",
    subtitle: "Help & support",
    href: createWhatsappLink(),
    icon: MessageCircle,
    tone: "bg-[var(--dc-violet-soft)] text-[var(--dc-violet)] border-[var(--dc-violet)]/15",
    iconTone: "bg-[var(--dc-violet)] text-white",
    external: true,
  },
  {
    title: "Wallet",
    subtitle: "Balance & history",
    href: "/customer/dashboard?tab=wallet",
    icon: Wallet,
    tone: "bg-[var(--dc-cyan-soft)] text-[var(--dc-cyan)] border-[var(--dc-cyan)]/20",
    iconTone: "bg-[var(--dc-cyan)] text-white",
  },
] as const;

export function QuickActions() {
  return (
    <HomepageSection id="quick-actions" surface="cream" compact>
      <HomepageSectionHeader eyebrow="Shortcuts" title="Quick actions" />

      <HomepageMobileRail className="sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 sm:pr-0">
        {actions.map((action) => {
          const Icon = action.icon;
          const className = `group flex min-h-[4.75rem] w-[74%] max-w-[220px] shrink-0 snap-start items-center gap-3 rounded-[var(--dc-card-radius)] border px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-600)] sm:w-auto sm:max-w-none ${action.tone}`;
          const body = (
            <>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.iconTone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-extrabold text-[var(--dc-ink)]">{action.title}</span>
                <span className="mt-0.5 hidden text-[12px] font-semibold opacity-80 sm:block">{action.subtitle}</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-current shadow-sm transition group-hover:bg-white">
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
