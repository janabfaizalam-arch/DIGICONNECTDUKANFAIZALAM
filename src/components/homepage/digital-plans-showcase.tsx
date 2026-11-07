import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";
import { formatPaise } from "@/lib/digital-plans/money";
import { getCachedDigitalCatalogue } from "@/lib/homepage/cached";
import { cn } from "@/lib/utils";

/**
 * "Digital Solutions & Plans" — three RNOS Digital plans on the homepage.
 *
 * Which plans appear is set in the packages admin ("Show on the homepage"),
 * and the prices come from the same database rows as /packages, so the two
 * can never disagree. Get Started goes to the plan's page with its enquiry
 * form open, keeping the form's code off the homepage.
 */
export async function DigitalPlansShowcase() {
  const { plans } = await getCachedDigitalCatalogue();
  const featured = plans.filter((plan) => plan.featuredOnHomepage).slice(0, 3);
  if (!featured.length) return null;

  return (
    <HomepageSection id="digital-plans" surface="sky">
      <HomepageSectionHeader
        eyebrow="RNOS Digital"
        title="Digital Solutions & Plans"
        description="Websites, software, SEO and marketing as clear monthly plans — with the setup fee and terms stated upfront."
        actionHref="/packages"
        actionLabel="View All Plans"
      />
      <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
        {featured.map((plan) => {
          const dark = plan.isRecommended;
          return (
            <li key={plan.slug} className="min-w-0">
              <article
                className={cn(
                  "flex h-full flex-col rounded-[24px] p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 motion-reduce:transform-none sm:p-6",
                  dark
                    ? "bg-[radial-gradient(120%_80%_at_50%_0%,#0b4fb3_0%,#012e7b_45%,#001d5f_100%)] text-white shadow-[0_30px_60px_-30px_rgba(1,29,95,0.7)]"
                    : "bg-white text-[var(--dc-ink)] shadow-[0_20px_50px_-36px_rgba(1,29,95,0.4)] ring-1 ring-slate-900/[0.07]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-extrabold tracking-[-0.025em]">{plan.name}</h3>
                  {dark ? <span className="rounded-full bg-gradient-to-r from-[#ffb057] to-[var(--dc-flame)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">Recommended</span> : null}
                </div>
                <p className={cn("mt-1.5 text-[13.5px] font-medium leading-snug", dark ? "text-white/75" : "text-[var(--dc-body)]")}>{plan.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  {plan.priceIsStarting ? <span className={cn("text-xs font-bold", dark ? "text-white/60" : "text-[var(--dc-muted)]")}>From</span> : null}
                  <span className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{formatPaise(plan.monthlyPricePaise)}</span>
                  <span className={cn("text-sm font-semibold", dark ? "text-white/70" : "text-[var(--dc-muted)]")}>/month</span>
                </p>
                <p className={cn("mt-1.5 text-xs font-medium", dark ? "text-white/65" : "text-[var(--dc-muted)]")}>
                  + {formatPaise(plan.setupFeePaise)}
                  {plan.priceIsStarting ? " onwards" : ""} setup · GST extra
                </p>
                <ul className="mt-5 grid gap-2 text-[13.5px] font-medium">
                  {plan.features
                    .filter((feature) => feature.highlight)
                    .slice(0, 4)
                    .map((feature) => (
                      <li key={feature.key} className="flex gap-2">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", dark ? "text-[var(--dc-amber)]" : "text-[var(--dc-blue-bright)]")} aria-hidden="true" />
                        <span className={dark ? "text-white/90" : "text-[var(--dc-body)]"}>{feature.label}</span>
                      </li>
                    ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Link
                    href={`/packages/${plan.slug}?enquire=${plan.slug}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--dc-flame)] px-4 text-sm font-bold text-white transition-colors hover:bg-[var(--dc-flame-deep)]"
                  >
                    Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">with {plan.name}</span>
                  </Link>
                  <Link
                    href={`/packages/${plan.slug}`}
                    className={cn("inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold transition-colors", dark ? "text-white ring-1 ring-white/25 hover:bg-white/10" : "text-[var(--dc-ink)] ring-1 ring-slate-900/15 hover:bg-slate-50")}
                  >
                    Details<span className="sr-only"> of {plan.name}</span>
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </HomepageSection>
  );
}
