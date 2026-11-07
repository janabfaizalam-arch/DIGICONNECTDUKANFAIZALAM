import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleSlash, MessageCircle, Wrench } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { EnquireButton, EnquiryProvider } from "@/components/packages/enquiry";
import {
  Accent,
  AddonGrid,
  btnGhost,
  btnPrimary,
  CommercialNotes,
  Eyebrow,
  FaqList,
  OnboardingSteps,
  PlanPrice,
  SectionTitle,
  toEnquiryPlans,
} from "@/components/packages/parts";
import { FadeUp, MagneticLink, RiseText } from "@/components/portfolio/interactive";
import { GENERAL_FAQS } from "@/lib/digital-plans/commercial";
import { DEFAULT_PLANS } from "@/lib/digital-plans/defaults";
import { formatPaise, quoteTotals } from "@/lib/digital-plans/money";
import { FEATURE_GROUPS } from "@/lib/digital-plans/types";
import { getCachedDigitalCatalogue } from "@/lib/homepage/cached";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";

/** Pre-render the shipped plans; a plan an admin adds later renders on first visit. */
export function generateStaticParams() {
  return DEFAULT_PLANS.map((plan) => ({ slug: plan.slug }));
}

type Props = { params: Promise<{ slug: string }> };

async function findPlan(slug: string) {
  const catalogue = await getCachedDigitalCatalogue();
  return { catalogue, plan: catalogue.plans.find((item) => item.slug === slug) ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { plan } = await findPlan(slug);
  if (!plan) return { title: "Plan not found | RNOS Digital", robots: { index: false } };
  const title = `${plan.name} Plan — ${formatPaise(plan.monthlyPricePaise)}/month | RNOS Digital`;
  const description = `${plan.description} ${plan.priceIsStarting ? "From " : ""}${formatPaise(plan.monthlyPricePaise)}/month + ${formatPaise(plan.setupFeePaise)} setup, GST extra.`;
  return {
    title,
    description,
    alternates: { canonical: `/packages/${plan.slug}` },
    openGraph: { title, description, type: "website", url: `${siteUrl}/packages/${plan.slug}`, siteName: "RNOS India Pvt. Ltd.", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PlanPage({ params }: Props) {
  const { slug } = await params;
  const { catalogue, plan } = await findPlan(slug);
  if (!plan) notFound();

  const addons = plan.addonSlugs.map((addonSlug) => catalogue.addons.find((addon) => addon.slug === addonSlug)).filter((addon) => addon !== undefined);
  const firstPayment = quoteTotals({ monthlyPaise: plan.monthlyPricePaise, setupPaise: plan.setupFeePaise, gstPercent: 18, commitmentMonths: plan.commitmentMonths });
  const whatsappUrl = buildWhatsAppUrl(`Hello RNOS Digital, I am interested in the ${plan.name} plan. Please share the details.`);
  const others = catalogue.plans.filter((item) => item.slug !== plan.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Packages", item: `${siteUrl}/packages` },
        { "@type": "ListItem", position: 3, name: plan.name, item: `${siteUrl}/packages/${plan.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `RNOS Digital ${plan.name} plan`,
      description: plan.description,
      provider: { "@type": "Organization", name: "RNOS India Pvt. Ltd.", url: siteUrl },
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        priceSpecification: { "@type": "UnitPriceSpecification", price: (plan.monthlyPricePaise / 100).toFixed(2), priceCurrency: "INR", unitText: "MONTH", valueAddedTaxIncluded: false },
      },
    },
  ];

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EnquiryProvider plans={toEnquiryPlans([plan], catalogue.addons)} whatsappUrl={whatsappUrl}>
        <main id="main-content" className="overflow-x-clip bg-white">
          <section aria-labelledby="plan-title" className="relative isolate overflow-hidden bg-[var(--dc-blue-deep)] text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_85%_0%,rgba(17,112,221,0.5),transparent_62%),linear-gradient(180deg,#001536_0%,#012456_60%,#013a8e_100%)]" />
            <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-20 pt-8 sm:px-6 lg:px-10">
              <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/55">
                <ol className="flex flex-wrap items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-white">Home</Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href="/packages" className="hover:text-white">Packages</Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-white/80">{plan.name}</li>
                </ol>
              </nav>
              <div className="mt-12 grid items-end gap-12 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <FadeUp className="flex flex-wrap items-center gap-2">
                    {plan.isRecommended ? (
                      <span className="rounded-full bg-gradient-to-r from-[#ffb057] to-[var(--dc-flame)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">Recommended</span>
                    ) : null}
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">RNOS Digital plan</span>
                  </FadeUp>
                  <h1 id="plan-title" className="mt-5 font-[family-name:var(--font-heading)] text-[clamp(2.75rem,6.5vw,5.25rem)] font-semibold leading-[0.96] tracking-[-0.055em]">
                    <RiseText text={plan.name} />
                  </h1>
                  <FadeUp delay={0.3}>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">{plan.description}</p>
                    {plan.bestFor ? (
                      <p className="mt-4 max-w-2xl text-[15px] text-white/60">
                        <strong className="font-semibold text-white/85">Best for:</strong> {plan.bestFor}
                      </p>
                    ) : null}
                  </FadeUp>
                </div>
                <FadeUp delay={0.4} className="rounded-[28px] bg-white/[0.06] p-7 ring-1 ring-white/15 backdrop-blur">
                  <PlanPrice plan={plan} tone="dark" size="lg" />
                  <p className="mt-5 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-white/80">
                    First payment: setup + first month ={" "}
                    <strong className="text-white">{plan.priceIsStarting ? "from " : ""}{formatPaise(firstPayment.firstPaymentPaise)}</strong> incl. 18% GST
                  </p>
                  <div className="mt-6 grid gap-2">
                    <EnquireButton planSlug={plan.slug} planName={plan.name} className={`${btnPrimary} w-full`} />
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold text-white hover:bg-white/10">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask on WhatsApp
                    </a>
                  </div>
                </FadeUp>
              </div>
            </div>
          </section>

          {/* Included */}
          <section aria-labelledby="plan-included" className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
            <Reveal className="max-w-3xl">
              <Eyebrow>What&apos;s included</Eyebrow>
              <SectionTitle id="plan-included">
                Everything in <Accent>{plan.name}.</Accent>
              </SectionTitle>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_GROUPS.map((group) => {
                const features = plan.features.filter((feature) => feature.group === group.id);
                if (!features.length) return null;
                return (
                  <Reveal key={group.id}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-muted)]">{group.label}</h3>
                    <ul className="mt-4 grid gap-3">
                      {features.map((feature) => (
                        <li key={feature.key} className="flex gap-3 text-[15px] leading-6 text-[var(--dc-ink)]">
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                          {feature.label}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* Limits, exclusions, maintenance */}
          <section aria-labelledby="plan-limits" className="border-y border-slate-900/5 bg-[var(--dc-sky-soft)]">
            <div className="mx-auto grid max-w-[var(--dc-max)] gap-6 px-4 py-24 sm:px-6 lg:grid-cols-3 lg:px-10">
              <Reveal className="rounded-[24px] bg-white p-7 ring-1 ring-slate-900/5">
                <h2 id="plan-limits" className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.02em] text-[var(--dc-ink)]">Limits</h2>
                <dl className="mt-5 grid gap-4">
                  {plan.limits.map((limit) => (
                    <div key={limit.label}>
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--dc-muted)]">{limit.label}</dt>
                      <dd className="mt-1 text-[15px] text-[var(--dc-ink)]">{limit.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
              <Reveal delay={0.06} className="rounded-[24px] bg-white p-7 ring-1 ring-slate-900/5">
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.02em] text-[var(--dc-ink)]">
                  <CircleSlash className="h-5 w-5 text-[var(--dc-flame)]" aria-hidden="true" /> Not included
                </h2>
                <ul className="mt-5 grid gap-3">
                  {plan.exclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-6 text-[var(--dc-body)]">
                      <span aria-hidden="true" className="mt-2.5 h-1 w-3 shrink-0 rounded bg-slate-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.12} className="rounded-[24px] bg-[var(--dc-ink)] p-7 text-white">
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.02em]">
                  <Wrench className="h-5 w-5 text-[var(--dc-amber)]" aria-hidden="true" /> Maintenance
                </h2>
                <p className="mt-5 text-[15px] leading-7 text-white/80">{plan.maintenance}</p>
              </Reveal>
            </div>
          </section>

          {/* Add-ons */}
          {addons.length ? (
            <section aria-labelledby="plan-addons" className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
              <Reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <Eyebrow>Extra charges</Eyebrow>
                  <SectionTitle id="plan-addons">
                    Add-ons for <Accent>{plan.name}.</Accent>
                  </SectionTitle>
                </div>
                <p className="max-w-sm text-sm leading-6 text-[var(--dc-muted)]">Charged only if you choose them, at the prices below plus GST. Third-party charges are separate.</p>
              </Reveal>
              <Reveal className="mt-12">
                <AddonGrid addons={addons} />
              </Reveal>
            </section>
          ) : null}

          {/* Onboarding */}
          <section aria-labelledby="plan-onboarding" className="relative isolate overflow-hidden bg-[#020d24] text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(1,89,199,0.45),transparent_70%)]" />
            <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
              <Reveal className="max-w-3xl">
                <Eyebrow tone="dark">Onboarding</Eyebrow>
                <SectionTitle id="plan-onboarding" tone="dark">
                  From enquiry <Accent>to launch.</Accent>
                </SectionTitle>
              </Reveal>
              <Reveal className="mt-12">
                <OnboardingSteps tone="dark" />
              </Reveal>
            </div>
          </section>

          {/* Terms */}
          <section aria-labelledby="plan-terms" className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <Reveal>
                <Eyebrow>Subscription terms</Eyebrow>
                <SectionTitle id="plan-terms">
                  The <Accent>fine print,</Accent> in plain words.
                </SectionTitle>
                <p className="mt-6 text-[15px] leading-7 text-[var(--dc-body)]">{plan.terms}</p>
              </Reveal>
              <Reveal delay={0.08}>
                <CommercialNotes compact />
              </Reveal>
            </div>
          </section>

          {/* FAQ + CTA */}
          <section aria-labelledby="plan-faq" className="border-t border-slate-900/5 bg-[var(--dc-cream)]">
            <div className="mx-auto grid max-w-[var(--dc-max)] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
              <Reveal>
                <Eyebrow>FAQ</Eyebrow>
                <SectionTitle id="plan-faq">
                  About <Accent>{plan.name}.</Accent>
                </SectionTitle>
                <div className="mt-8 flex flex-wrap gap-3">
                  <EnquireButton planSlug={plan.slug} planName={plan.name} className={btnPrimary} />
                  <MagneticLink href="/packages#compare" className={btnGhost}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Compare plans
                  </MagneticLink>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <FaqList faqs={[...plan.faqs, ...GENERAL_FAQS]} />
              </Reveal>
            </div>
          </section>

          {others.length ? (
            <nav aria-label="Other plans" className="mx-auto max-w-[var(--dc-max)] px-4 py-16 sm:px-6 lg:px-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-muted)]">Other plans</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link href={`/packages/${other.slug}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--dc-ink)] ring-1 ring-slate-900/10 transition-colors hover:bg-[var(--dc-sky-soft)]">
                      {other.name}
                      <span className="tabular-nums text-[var(--dc-muted)]">
                        {other.priceIsStarting ? "from " : ""}
                        {formatPaise(other.monthlyPricePaise)}/mo
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </main>
      </EnquiryProvider>
      <MarketingFooter />
    </MotionRoot>
  );
}
