import Link from "next/link";
import { Car, CarFront, FileSpreadsheet, Plane, Receipt, ShieldCheck } from "lucide-react";

import { serviceHref } from "@/lib/search/service-search";

/**
 * The six services people arrive for, by their real catalogue slug.
 *
 * Slugs are taken from src/lib/services-data.ts — "Driving Licence" is
 * `learning-driving-license` and "DPR" is `detailed-project-report` there, so
 * shortening either label here must not shorten the href with it.
 */
const POPULAR_SERVICES = [
  { label: "GST Registration", slug: "gst-registration", icon: Receipt },
  { label: "ITR Filing", slug: "itr-filing", icon: FileSpreadsheet },
  { label: "Passport", slug: "passport", icon: Plane },
  { label: "Driving Licence", slug: "learning-driving-license", icon: CarFront },
  { label: "Insurance", slug: "insurance", icon: Car },
  { label: "DPR Project Report", slug: "detailed-project-report", icon: ShieldCheck },
] as const;

/**
 * A row of one-tap shortcuts under the search box.
 *
 * On phones it scrolls horizontally rather than wrapping into a tall block
 * that would push the hero's trust strip off the first screen.
 */
export function HeroPopularServices() {
  return (
    <nav aria-label="Popular services" className="w-full">
      <ul className="no-scrollbar -mx-[var(--mobile-page-gutter)] flex snap-x snap-mandatory gap-2 overflow-x-auto px-[var(--mobile-page-gutter)] pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
        {POPULAR_SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <li key={service.slug} className="snap-start">
              <Link
                href={serviceHref(service.slug)}
                className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-bold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon className="h-4 w-4 text-[var(--dc-orange-400)]" aria-hidden="true" />
                {service.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
