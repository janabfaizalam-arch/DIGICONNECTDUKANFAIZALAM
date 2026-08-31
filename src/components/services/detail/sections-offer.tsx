"use client";

import { CheckCircle2, Info } from "lucide-react";

import { ServiceCard, ServiceCta, ServiceSection, WhatsAppIcon } from "@/components/services/shell";
import { safeCurrency } from "@/lib/admin-format";
import type { DbServiceVariant } from "@/lib/services";
import type { ServiceDetail } from "@/lib/services/detail-blueprint";

/* ─────────────────────────────────────────────────────────────────────────
   11 — Pricing
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What it costs.
 *
 * One card when the service has a single fee, one card per plan when it has
 * variants, and in both cases the government fee is named as a separate thing
 * rather than folded into a single number that would be wrong for half the
 * applicants.
 */
export function ServicePricingSection({
  detail,
  isLoggedIn,
  selectedVariant,
  onSelectVariant,
}: {
  detail: ServiceDetail;
  isLoggedIn: boolean;
  selectedVariant: DbServiceVariant | null;
  onSelectVariant: (variant: DbServiceVariant) => void;
}) {
  const { service, variants, applyHref, whatsappHref, price } = detail;
  const applyLabel = isLoggedIn ? "Apply now" : "Login to apply";

  return (
    <ServiceSection
      id="pricing"
      surface="white"
      eyebrow="Pricing"
      title={variants.length > 1 ? "Choose your plan" : "What this costs"}
      description={
        price.quoted
          ? "Our professional fee. Any government or department fee is charged at actuals and named on your receipt."
          : "This one is quoted case by case. Send us the details and you will have a figure before any work starts — including any government fee, named separately."
      }
    >
      {variants.length > 1 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant) => {
            const active = selectedVariant?.id === variant.id;
            const price = variant.offer_price || variant.selling_price;

            return (
              <li key={variant.id}>
                <ServiceCard
                  className={`h-full p-5 transition sm:p-6 ${active ? "ring-2 ring-[var(--dc-flame)]" : ""}`}
                >
                  <h3 className="text-[15.5px] font-extrabold text-[var(--dc-ink)]">{variant.name}</h3>
                  {variant.description ? (
                    <p className="mt-1.5 text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">
                      {variant.description}
                    </p>
                  ) : null}

                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="text-[1.5rem] font-extrabold tracking-[-0.02em] text-[var(--dc-ink)]">
                      {safeCurrency(price)}
                    </span>
                    {variant.original_price > price ? (
                      <span className="text-[13px] font-bold text-[var(--dc-body)]/60 line-through">
                        {safeCurrency(variant.original_price)}
                      </span>
                    ) : null}
                  </p>

                  {variant.timeline ? (
                    <p className="mt-1.5 text-[12.5px] font-semibold text-[var(--dc-body)]">{variant.timeline}</p>
                  ) : null}
                  {variant.government_fees > 0 ? (
                    <p className="mt-1 text-[12px] font-semibold text-[var(--dc-flame)]">
                      Government fee {safeCurrency(variant.government_fees)} extra
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onSelectVariant(variant)}
                    aria-pressed={active}
                    className={`mt-4 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-bold transition active:scale-[0.98] ${
                      active ? "text-white" : "lg-pill lg-raise text-[var(--dc-blue-mid)]"
                    }`}
                    style={active ? { background: "var(--dc-grad-blue)" } : undefined}
                  >
                    {active ? "Selected" : "Choose this plan"}
                  </button>
                </ServiceCard>
              </li>
            );
          })}
        </ul>
      ) : (
        <ServiceCard className="mx-auto max-w-xl p-6 text-center sm:p-8">
          <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
            <span
              className={`font-extrabold tracking-[-0.02em] text-[var(--dc-ink)] ${
                price.quoted ? "text-[2rem] sm:text-[2.5rem]" : "text-[1.35rem] sm:text-[1.6rem]"
              }`}
            >
              {price.display}
            </span>
            {price.strikethrough ? (
              <span className="text-[15px] font-bold text-[var(--dc-body)]/60 line-through">
                {price.strikethrough}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-[12.5px] font-semibold text-[var(--dc-body)]">
            {price.quoted
              ? `Professional fee for ${service.title}.`
              : `Ask us for a figure for ${service.title} — it costs nothing to ask.`}
          </p>
        </ServiceCard>
      )}

      <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        {service.ctaType === "apply" ? (
          <ServiceCta href={applyHref} label={applyLabel} variant="solid" />
        ) : (
          <ServiceCta href={whatsappHref} label="Send an enquiry" variant="solid" external />
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="lg-pill lg-raise inline-flex h-11 items-center justify-center gap-2 px-5 text-[13.5px] font-bold text-[var(--dc-blue-mid)] transition active:scale-[0.98] sm:h-12 sm:px-6 sm:text-[15px]"
        >
          <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
          Ask before you pay
        </a>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   12 — Comparison
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The administrator's comparison table.
 *
 * Scrolls inside its own container rather than pushing the page sideways —
 * a five-column table on a 390px phone is the single most common cause of a
 * page that scrolls horizontally.
 */
export function ServiceComparisonSection({ detail }: { detail: ServiceDetail }) {
  const comparison = detail.comparison;
  if (!comparison?.headers?.length || !comparison.rows?.length) return null;

  return (
    <ServiceSection
      id="comparison"
      surface="sky"
      eyebrow="Compare"
      title={comparison.title || "How this compares"}
      description={comparison.description || undefined}
    >
      <ServiceCard className="p-2 sm:p-3" interactive={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr>
                {comparison.headers.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-flame)]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, index) => (
                <tr key={index} className="border-t border-[var(--dc-ink)]/8">
                  {comparison.headers.map((header) => (
                    <td
                      key={header}
                      className="px-4 py-3 text-[13px] font-semibold leading-snug text-[var(--dc-ink)]"
                    >
                      {String(row?.[header] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ServiceCard>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   22 — Final CTA
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceFinalCtaSection({ detail, isLoggedIn }: { detail: ServiceDetail; isLoggedIn: boolean }) {
  const { service, applyHref, whatsappHref } = detail;

  return (
    <ServiceSection id="apply" surface="navy" wash="dual">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-[1.5rem] font-extrabold leading-[1.15] tracking-[-0.025em] text-white sm:text-[2.1rem]">
          Ready to file your {service.title.toLowerCase()}?
        </h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-[13.5px] font-medium leading-[1.6] text-white/72 sm:text-[16px]">
          Send your details once. We check the documents, file it, and keep you posted until the paper is in
          your hand.
        </p>

        <ul className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] font-semibold text-white/70">
          {["No advance document courier", "Pay online, get a receipt", "Track it in your dashboard"].map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[var(--dc-amber)]" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          {service.ctaType === "apply" ? (
            <ServiceCta href={applyHref} label={isLoggedIn ? "Apply now" : "Login to apply"} variant="primary" />
          ) : (
            <ServiceCta href={whatsappHref} label="Send an enquiry" variant="primary" external />
          )}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="lg-pill-dark lg-raise-dark inline-flex h-11 items-center justify-center gap-2 px-5 text-[13.5px] font-bold text-white transition active:scale-[0.98] sm:h-12 sm:px-6 sm:text-[15px]"
          >
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            Talk to us first
          </a>
        </div>
      </div>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   23 — Disclaimer
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The last band, and a required one.
 *
 * DigiConnect Dukan is a private filing service. Saying so plainly at the
 * bottom of every service page is both the honest thing and the thing that
 * keeps a customer from arriving at a government office believing they have
 * dealt with the government.
 */
export function ServiceDisclaimerSection({ detail }: { detail: ServiceDetail }) {
  return (
    <ServiceSection id="disclaimer" surface="white" wash="none" className="!py-7 sm:!py-9">
      <ServiceCard className="flex items-start gap-3 p-4 sm:p-5" interactive={false}>
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-body)]" aria-hidden="true" />
        <p className="min-w-0 text-[12px] font-medium leading-[1.65] text-[var(--dc-body)] sm:text-[12.5px]">
          <strong className="font-extrabold text-[var(--dc-ink)]">Disclaimer.</strong> DigiConnect Dukan
          (RNOS India Pvt Ltd) is a private service provider and is not a government body or an agent of one.
          The fee shown for {detail.service.title} is our professional charge for preparing and submitting the
          application; any government, department or statutory fee is separate and is charged at actuals.
          Approval rests entirely with the concerned department, and neither an outcome nor a processing time
          can be guaranteed. Timelines quoted are typical, not promised.
        </p>
      </ServiceCard>
    </ServiceSection>
  );
}
