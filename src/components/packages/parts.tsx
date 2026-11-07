import Link from "next/link";
import { ArrowUpRight, Check, Minus, Plus, Sparkles } from "lucide-react";

import { EnquireButton, type EnquiryPlan } from "@/components/packages/enquiry";
import {
  COMMERCIAL_NOTES,
  ONBOARDING_STEPS,
} from "@/lib/digital-plans/commercial";
import type { ComparisonGroup } from "@/lib/digital-plans/comparison";
import {
  formatAddonPrice,
  formatPaise,
  UNIT_LABEL,
} from "@/lib/digital-plans/money";
import type { DigitalAddon, DigitalPlan } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

/** The plan list in the shape the enquiry dialog needs, with each plan's add-ons resolved. */
export function toEnquiryPlans(
  plans: DigitalPlan[],
  addons: DigitalAddon[],
): EnquiryPlan[] {
  return plans.map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    monthlyPricePaise: plan.monthlyPricePaise,
    setupFeePaise: plan.setupFeePaise,
    priceIsStarting: plan.priceIsStarting,
    commitmentMonths: plan.commitmentMonths,
    addons: plan.addonSlugs
      .map((slug) => addons.find((addon) => addon.slug === slug))
      .filter((addon): addon is DigitalAddon => Boolean(addon))
      .map((addon) => ({
        slug: addon.slug,
        name: addon.name,
        pricePaise: addon.pricePaise,
        unit: addon.unit,
        priceIsStarting: addon.priceIsStarting,
      })),
  }));
}

export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--dc-flame)] px-6 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(247,74,1,0.7)] transition-[background-color,box-shadow] duration-300 hover:bg-[var(--dc-flame-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] focus-visible:ring-offset-2";
export const btnGhostDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-6 text-[15px] font-bold text-white ring-1 ring-white/20 backdrop-blur transition-[background-color] duration-300 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
export const btnGhost =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold text-[var(--dc-ink)] ring-1 ring-slate-900/15 transition-colors duration-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]";

/** "₹3,999 /month" with the setup fee beneath — the one way a plan price is drawn. */
export function PlanPrice({
  plan,
  tone = "light",
  size = "md",
}: {
  plan: DigitalPlan;
  tone?: "light" | "dark";
  size?: "md" | "lg";
}) {
  const dark = tone === "dark";
  return (
    <div>
      {plan.priceIsStarting ? (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            dark ? "text-white/60" : "text-[var(--dc-muted)]",
          )}
        >
          Starting from
        </p>
      ) : null}
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-[family-name:var(--font-heading)] font-semibold tabular-nums tracking-[-0.04em]",
            size === "lg"
              ? "text-[3.25rem] leading-none"
              : "text-[2.6rem] leading-none",
            dark ? "text-white" : "text-[var(--dc-ink)]",
          )}
        >
          {formatPaise(plan.monthlyPricePaise)}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            dark ? "text-white/70" : "text-[var(--dc-muted)]",
          )}
        >
          /month
        </span>
      </p>
      <p
        className={cn(
          "mt-2 text-sm",
          dark ? "text-white/80" : "text-[var(--dc-body)]",
        )}
      >
        +{" "}
        <strong
          className={cn(
            "font-semibold",
            dark ? "text-white" : "text-[var(--dc-ink)]",
          )}
        >
          {formatPaise(plan.setupFeePaise)}
        </strong>{" "}
        one-time setup
        {plan.priceIsStarting ? " (from)" : ""}
      </p>
      <p
        className={cn(
          "mt-1 text-xs",
          dark ? "text-white/55" : "text-[var(--dc-muted)]",
        )}
      >
        GST extra
        {plan.commitmentMonths
          ? ` · ${plan.commitmentMonths}-month minimum`
          : ""}
      </p>
    </div>
  );
}

export function PlanCard({
  plan,
  index,
}: {
  plan: DigitalPlan;
  index: number;
}) {
  const dark = plan.isRecommended;
  const highlights = plan.features
    .filter((feature) => feature.highlight)
    .slice(0, 6);
  const more = plan.features.length - highlights.length;

  return (
    <div className="group/card h-full [perspective:1400px]">
      <article
        aria-labelledby={`plan-${plan.slug}`}
        className={cn(
          "relative flex h-full flex-col rounded-[28px] p-6 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] sm:p-7",
          "group-hover/card:[transform:translateY(-6px)_rotateX(2deg)] motion-reduce:transition-none motion-reduce:group-hover/card:transform-none",
          dark
            ? "bg-[radial-gradient(120%_80%_at_50%_0%,#0b4fb3_0%,#012e7b_45%,#001d5f_100%)] text-white shadow-[0_40px_80px_-30px_rgba(1,29,95,0.75)] ring-1 ring-white/10 xl:-my-4 xl:py-11"
            : "bg-white text-[var(--dc-ink)] shadow-[0_24px_60px_-40px_rgba(1,29,95,0.35)] ring-1 ring-slate-900/[0.07] group-hover/card:shadow-[0_40px_80px_-40px_rgba(1,29,95,0.45)]",
        )}
      >
        {dark ? (
          <p className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffb057] to-[var(--dc-flame)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-lg">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Recommended
          </p>
        ) : null}
        <p
          className={cn(
            "font-mono text-xs font-semibold",
            dark ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]",
          )}
        >
          Plan {String(index + 1).padStart(2, "0")}
        </p>
        <h3
          id={`plan-${plan.slug}`}
          className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.035em]"
        >
          {plan.name}
        </h3>
        <p
          className={cn(
            "mt-2 min-h-[3rem] text-sm leading-6",
            dark ? "text-white/75" : "text-[var(--dc-body)]",
          )}
        >
          {plan.tagline}
        </p>

        <div
          className={cn(
            "my-6 border-y py-6",
            dark ? "border-white/10" : "border-slate-900/[0.07]",
          )}
        >
          <PlanPrice plan={plan} tone={dark ? "dark" : "light"} />
        </div>

        <ul
          className="grid gap-2.5 text-sm"
          aria-label={`${plan.name} highlights`}
        >
          {highlights.map((feature) => (
            <li key={feature.key} className="flex gap-2.5">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  dark
                    ? "text-[var(--dc-amber)]"
                    : "text-[var(--dc-blue-bright)]",
                )}
                aria-hidden="true"
              />
              <span
                className={dark ? "text-white/90" : "text-[var(--dc-body)]"}
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>
        {more > 0 ? (
          <p
            className={cn(
              "mt-3 text-xs font-medium",
              dark ? "text-white/60" : "text-[var(--dc-muted)]",
            )}
          >
            + {more} more included
          </p>
        ) : null}

        <div className="mt-auto grid gap-2 pt-7">
          <EnquireButton
            planSlug={plan.slug}
            planName={plan.name}
            className={cn(btnPrimary, "w-full")}
          />
          <Link
            href={`/packages/${plan.slug}`}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors",
              dark
                ? "text-white hover:bg-white/10"
                : "text-[var(--dc-ink)] hover:bg-slate-50",
            )}
          >
            Full details <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">of {plan.name}</span>
          </Link>
        </div>
      </article>
    </div>
  );
}

export function ComparisonTable({
  plans,
  groups,
}: {
  plans: DigitalPlan[];
  groups: ComparisonGroup[];
}) {
  return (
    <>
      <p
        className="mb-3 text-xs font-medium text-[var(--dc-muted)] lg:hidden"
        aria-hidden="true"
      >
        Swipe sideways to see every plan →
      </p>
      <div
        className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        role="region"
        aria-label="Plan comparison table"
        tabIndex={0}
      >
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm lg:min-w-[860px]">
          <caption className="sr-only">
            Features included in each RNOS Digital plan. A dash means not
            included.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-20 w-[8.5rem] bg-white py-5 pr-3 sm:w-[26%] sm:pr-4 align-bottom text-xs font-bold uppercase tracking-[0.14em] text-[var(--dc-muted)]"
              >
                Feature
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.slug}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 px-3 py-5 align-bottom",
                    plan.isRecommended
                      ? "rounded-t-2xl bg-[var(--dc-blue-deep)] text-white"
                      : "bg-white",
                  )}
                >
                  {plan.isRecommended ? (
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dc-amber)]">
                      Recommended
                    </span>
                  ) : null}
                  <span className="block font-[family-name:var(--font-heading)] text-base font-semibold">
                    {plan.name}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-medium tabular-nums",
                      plan.isRecommended
                        ? "text-white/70"
                        : "text-[var(--dc-muted)]",
                    )}
                  >
                    {plan.priceIsStarting ? "from " : ""}
                    {formatPaise(plan.monthlyPricePaise)}/mo
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-slate-900/[0.07] bg-white py-3.5 pr-4 font-medium text-[var(--dc-ink)]"
              >
                One-time setup
              </th>
              {plans.map((plan) => (
                <td
                  key={plan.slug}
                  className={cn(
                    "border-t px-3 py-3.5 tabular-nums",
                    plan.isRecommended
                      ? "border-white/10 bg-[var(--dc-blue-deep)] text-white"
                      : "border-slate-900/[0.07] text-[var(--dc-ink)]",
                  )}
                >
                  {plan.priceIsStarting ? "from " : ""}
                  {formatPaise(plan.setupFeePaise)}
                </td>
              ))}
            </tr>
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 border-t border-slate-900/[0.07] bg-white py-3.5 pr-4 font-medium text-[var(--dc-ink)]"
              >
                Minimum commitment
              </th>
              {plans.map((plan) => (
                <td
                  key={plan.slug}
                  className={cn(
                    "border-t px-3 py-3.5",
                    plan.isRecommended
                      ? "border-white/10 bg-[var(--dc-blue-deep)] text-white"
                      : "border-slate-900/[0.07] text-[var(--dc-ink)]",
                  )}
                >
                  {plan.commitmentMonths
                    ? `${plan.commitmentMonths} months`
                    : "None"}
                </td>
              ))}
            </tr>
            {groups.map((group) => (
              <GroupRows key={group.id} group={group} plans={plans} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function GroupRows({
  group,
  plans,
}: {
  group: ComparisonGroup;
  plans: DigitalPlan[];
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={plans.length + 1}
          className="sticky left-0 bg-white pb-2 pt-8 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-flame)]"
        >
          {group.label}
        </th>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.key} className="group/row">
          <th
            scope="row"
            className="sticky left-0 z-10 border-t border-slate-900/[0.07] bg-white py-3.5 pr-4 font-medium text-[var(--dc-ink)] transition-colors group-hover/row:bg-[var(--dc-sky-soft)]"
          >
            {row.label}
          </th>
          {row.cells.map((cell, index) => {
            const recommended = plans[index]?.isRecommended;
            return (
              <td
                key={plans[index]?.slug ?? index}
                className={cn(
                  "border-t px-3 py-3.5 transition-colors",
                  recommended
                    ? "border-white/10 bg-[var(--dc-blue-deep)] text-white"
                    : "border-slate-900/[0.07] text-[var(--dc-body)] group-hover/row:bg-[var(--dc-sky-soft)]",
                )}
              >
                {cell.included ? (
                  cell.value ? (
                    <span className="font-medium">{cell.value}</span>
                  ) : (
                    <>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          recommended
                            ? "text-[var(--dc-amber)]"
                            : "text-[var(--dc-blue-bright)]",
                        )}
                        aria-hidden="true"
                      />
                      <span className="sr-only">Included</span>
                    </>
                  )
                ) : (
                  <>
                    <Minus
                      className={cn(
                        "h-4 w-4",
                        recommended ? "text-white/30" : "text-slate-300",
                      )}
                      aria-hidden="true"
                    />
                    <span className="sr-only">Not included</span>
                  </>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function AddonGrid({ addons }: { addons: DigitalAddon[] }) {
  return (
    <ul className="grid overflow-hidden rounded-[24px] bg-white ring-1 ring-slate-900/10 sm:grid-cols-2 lg:grid-cols-3">
      {addons.map((addon) => (
        <li
          key={addon.slug}
          className="flex flex-col bg-white p-6 shadow-[inset_-1px_-1px_0_rgba(16,33,61,0.08)] transition-colors duration-300 hover:bg-[var(--dc-sky-soft)]"
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-[-0.02em] text-[var(--dc-ink)]">
              {addon.name}
            </h3>
            <span className="shrink-0 rounded-full bg-[var(--dc-blue-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--dc-brand-navy)]">
              {UNIT_LABEL[addon.unit]}
            </span>
          </div>
          <p className="mt-2 flex-1 text-sm leading-6 text-[var(--dc-body)]">
            {addon.description}
          </p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-xl font-semibold tabular-nums text-[var(--dc-ink)]">
            {formatAddonPrice(
              addon.pricePaise,
              addon.unit,
              addon.priceIsStarting,
            )}
          </p>
          {addon.note ? (
            <p className="mt-1 text-xs text-[var(--dc-muted)]">{addon.note}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CommercialNotes({ compact = false }: { compact?: boolean }) {
  return (
    <dl
      className={cn(
        "grid gap-x-10 gap-y-6",
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {COMMERCIAL_NOTES.map((note) => (
        <div key={note.title}>
          <dt className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-[var(--dc-ink)]">
            {note.title}
          </dt>
          <dd className="mt-1.5 text-sm leading-6 text-[var(--dc-body)]">
            {note.text}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OnboardingSteps({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <ol className="grid gap-px overflow-hidden rounded-[24px] sm:grid-cols-2 lg:grid-cols-3">
      {ONBOARDING_STEPS.map((step, index) => (
        <li
          key={step.title}
          className={cn(
            "p-6 sm:p-7",
            dark
              ? "bg-white/[0.04] ring-1 ring-inset ring-white/10"
              : "bg-white ring-1 ring-inset ring-slate-900/[0.06]",
          )}
        >
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              dark ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3
            className={cn(
              "mt-2 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[-0.02em]",
              dark ? "text-white" : "text-[var(--dc-ink)]",
            )}
          >
            {step.title}
          </h3>
          <p
            className={cn(
              "mt-1.5 text-sm leading-6",
              dark ? "text-white/70" : "text-[var(--dc-body)]",
            )}
          >
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function FaqList({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  return (
    <div className="divide-y divide-slate-900/10 border-y border-slate-900/10">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-sm font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[-0.02em] text-[var(--dc-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)] [&::-webkit-details-marker]:hidden">
            {faq.question}
            <Plus
              className="mt-1 h-5 w-5 shrink-0 text-[var(--dc-flame)] transition-transform duration-300 group-open:rotate-45"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--dc-body)]">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

export function Eyebrow({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.22em]",
        tone === "dark" ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]",
      )}
    >
      {children}
    </p>
  );
}

export const Accent = ({ children }: { children: React.ReactNode }) => (
  <span className="font-[family-name:var(--font-display)] font-normal italic tracking-[-0.01em]">
    {children}
  </span>
);

export function SectionTitle({
  id,
  children,
  tone = "light",
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "mt-4 font-[family-name:var(--font-heading)] text-[clamp(2rem,4.4vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.045em]",
        tone === "dark" ? "text-white" : "text-[var(--dc-ink)]",
        className,
      )}
    >
      {children}
    </h2>
  );
}
