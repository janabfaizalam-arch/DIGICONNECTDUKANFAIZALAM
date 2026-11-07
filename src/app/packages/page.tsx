import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { MotionRoot, Reveal } from "@/components/homepage/motion";
import { EnquiryProvider } from "@/components/packages/enquiry";
import {
  Accent,
  AddonGrid,
  btnGhost,
  btnGhostDark,
  btnPrimary,
  CommercialNotes,
  ComparisonTable,
  Eyebrow,
  FaqList,
  OnboardingSteps,
  PlanCard,
  SectionTitle,
  toEnquiryPlans,
} from "@/components/packages/parts";
import { CursorHalo, FadeUp, MagneticLink, RiseText } from "@/components/portfolio/interactive";
import { GENERAL_FAQS } from "@/lib/digital-plans/commercial";
import { buildComparison } from "@/lib/digital-plans/comparison";
import { getCachedDigitalCatalogue } from "@/lib/homepage/cached";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";
const TITLE = "Packages & Pricing | RNOS Digital — Website, SEO & Software Plans";
const DESCRIPTION =
  "Compare RNOS Digital's monthly plans for websites, e-commerce, custom software, SEO and digital marketing. Clear monthly prices, one-time setup fees and terms. GST extra.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/packages" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: `${siteUrl}/packages`, siteName: "RNOS India Pvt. Ltd.", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const whatsappUrl = buildWhatsAppUrl("Hello RNOS Digital, I would like help choosing the right digital plan for my business.");

export default async function PackagesPage() {
  const { plans, addons } = await getCachedDigitalCatalogue();
  const comparison = buildComparison(plans);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Packages", item: `${siteUrl}/packages` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "RNOS Digital website and digital services plans",
      provider: { "@type": "Organization", name: "RNOS India Pvt. Ltd.", url: siteUrl },
      areaServed: "IN",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Monthly plans",
        itemListElement: plans.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          url: `${siteUrl}/packages/${plan.slug}`,
          priceCurrency: "INR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: (plan.monthlyPricePaise / 100).toFixed(2),
            priceCurrency: "INR",
            unitText: "MONTH",
            valueAddedTaxIncluded: false,
          },
        })),
      },
    },
  ];

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CursorHalo />
      <EnquiryProvider plans={toEnquiryPlans(plans, addons)} whatsappUrl={whatsappUrl}>
        <main id="main-content" className="overflow-x-clip bg-white">
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section aria-labelledby="pk-title" className="relative isolate overflow-hidden bg-[var(--dc-blue-deep)] text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_0%,rgba(17,112,221,0.55),transparent_62%),radial-gradient(45%_40%_at_5%_100%,rgba(247,74,1,0.22),transparent_70%),linear-gradient(180deg,#001536_0%,#012456_55%,#013a8e_100%)]" />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(80%_70%_at_50%_30%,black,transparent)]"
            />
            <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pb-28 lg:pt-12">
              <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/55">
                <ol className="flex items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-white">Home</Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-white/80">Packages</li>
                </ol>
              </nav>
              <div className="mx-auto mt-12 max-w-4xl text-center lg:mt-16">
                <FadeUp>
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white/80 ring-1 ring-white/15">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dc-amber)]" />
                    RNOS Digital · Packages & Pricing
                  </p>
                </FadeUp>
                <h1 id="pk-title" className="mt-7 font-[family-name:var(--font-heading)] text-[clamp(2.5rem,6.2vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
                  <RiseText text="Choose the Right Digital Plan" className="block" />
                  <span className="block bg-gradient-to-r from-[#ffb057] via-[var(--dc-amber)] to-[var(--dc-flame)] bg-clip-text pb-2 text-transparent">
                    <RiseText text="for Your Business." className="font-[family-name:var(--font-display)] font-normal italic tracking-[-0.02em]" delay={0.2} />
                  </span>
                </h1>
                <FadeUp delay={0.45}>
                  <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/75">
                    Everything your business needs to build, manage and grow its digital presence — all under one roof.
                  </p>
                </FadeUp>
                <FadeUp delay={0.6} className="mt-9 flex flex-wrap justify-center gap-3">
                  <MagneticLink href="#plans" className={btnPrimary}>
                    See the plans <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </MagneticLink>
                  <MagneticLink href="#compare" className={btnGhostDark}>
                    Compare features
                  </MagneticLink>
                </FadeUp>
                <FadeUp delay={0.75}>
                  <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-white/65">
                    {["Monthly price and setup fee shown upfront", "GST extra, stated plainly", "Written quotation before anything starts"].map((item) => (
                      <li key={item} className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-[var(--dc-amber)]" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </FadeUp>
              </div>
            </div>
          </section>

          {/* ── Plans ────────────────────────────────────────────── */}
          <section id="plans" aria-labelledby="pk-plans" className="relative scroll-mt-24 bg-gradient-to-b from-[var(--dc-sky-soft)] to-white">
            <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-24 pt-20 sm:px-6 lg:px-10">
              <Reveal className="mx-auto max-w-3xl text-center">
                <Eyebrow>Five monthly plans</Eyebrow>
                <SectionTitle id="pk-plans">
                  From first website to <Accent>full digital operations.</Accent>
                </SectionTitle>
                <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[var(--dc-body)]">
                  Each plan has a monthly fee and a one-time setup fee. Growth Pro is our recommendation for most businesses that want enquiries from their
                  website; choose by what you need, not by the label.
                </p>
              </Reveal>
              {plans.length ? (
                <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
                  {plans.map((plan, index) => (
                    <Reveal key={plan.slug} delay={Math.min(index, 4) * 0.06} className="h-full">
                      <PlanCard plan={plan} index={index} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <p className="mt-16 rounded-2xl bg-white p-8 text-center text-[var(--dc-body)] ring-1 ring-slate-900/10">
                  Our plans are being updated. Please{" "}
                  <a href={whatsappUrl} className="font-semibold text-[var(--dc-blue-bright)] underline">message us on WhatsApp</a> for current pricing.
                </p>
              )}
              <p className="mt-10 text-center text-xs text-[var(--dc-muted)]">
                All prices in Indian rupees, excluding GST. Domain, hosting, third-party charges and ad budgets are separate where applicable.{" "}
                <a href="#terms" className="font-semibold text-[var(--dc-blue-bright)] underline-offset-2 hover:underline">Read the terms</a>
              </p>
            </div>
          </section>

          {/* ── Comparison ──────────────────────────────────────── */}
          {plans.length ? (
            <section id="compare" aria-labelledby="pk-compare" className="scroll-mt-24">
              <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
                <Reveal className="max-w-3xl">
                  <Eyebrow>Compare</Eyebrow>
                  <SectionTitle id="pk-compare">
                    Every feature, <Accent>side by side.</Accent>
                  </SectionTitle>
                  <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--dc-body)]">
                    A tick means included in the monthly plan; a dash means not included, though many are available as add-ons below.
                  </p>
                </Reveal>
                <Reveal className="mt-12">
                  <ComparisonTable plans={plans} groups={comparison} />
                </Reveal>
              </div>
            </section>
          ) : null}

          {/* ── Add-ons ─────────────────────────────────────────── */}
          {addons.length ? (
            <section id="addons" aria-labelledby="pk-addons" className="scroll-mt-24 border-y border-slate-900/5 bg-[var(--dc-sky-soft)]">
              <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
                <Reveal className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <Eyebrow>Add-on services</Eyebrow>
                    <SectionTitle id="pk-addons">
                      Add only <Accent>what you need.</Accent>
                    </SectionTitle>
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-[var(--dc-muted)]">
                    Starting prices, GST extra. Ad budgets and third-party charges are always separate and paid by you.
                  </p>
                </Reveal>
                <Reveal className="mt-12">
                  <AddonGrid addons={addons} />
                </Reveal>
              </div>
            </section>
          ) : null}

          {/* ── How it works ────────────────────────────────────── */}
          <section aria-labelledby="pk-how" className="relative isolate overflow-hidden bg-[#020d24] text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(1,89,199,0.45),transparent_70%)]" />
            <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
              <Reveal className="max-w-3xl">
                <Eyebrow tone="dark">How it works</Eyebrow>
                <SectionTitle id="pk-how" tone="dark">
                  Nothing starts <Accent>until you approve.</Accent>
                </SectionTitle>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/70">
                  Get Started sends an enquiry, not a payment. You receive a written quotation and approve it online before any work or billing begins.
                </p>
              </Reveal>
              <Reveal className="mt-12">
                <OnboardingSteps tone="dark" />
              </Reveal>
            </div>
          </section>

          {/* ── Terms ───────────────────────────────────────────── */}
          <section id="terms" aria-labelledby="pk-terms" className="scroll-mt-24">
            <div className="mx-auto max-w-[var(--dc-max)] px-4 py-24 sm:px-6 lg:px-10">
              <Reveal className="max-w-3xl">
                <Eyebrow>Clear terms</Eyebrow>
                <SectionTitle id="pk-terms">
                  What the price <Accent>does and doesn&apos;t cover.</Accent>
                </SectionTitle>
              </Reveal>
              <Reveal className="mt-12">
                <CommercialNotes />
              </Reveal>
            </div>
          </section>

          {/* ── FAQ ─────────────────────────────────────────────── */}
          <section aria-labelledby="pk-faq" className="border-t border-slate-900/5 bg-[var(--dc-cream)]">
            <div className="mx-auto grid max-w-[var(--dc-max)] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
              <Reveal>
                <Eyebrow>Questions</Eyebrow>
                <SectionTitle id="pk-faq">
                  Before you <Accent>decide.</Accent>
                </SectionTitle>
                <p className="mt-5 text-[15px] leading-7 text-[var(--dc-body)]">
                  Still unsure which plan fits? Tell us about your business and we will recommend one honestly — including a smaller one if that is enough.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <MagneticLink href={whatsappUrl} external className={btnPrimary} aria-label="Ask us on WhatsApp (opens in a new tab)">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask on WhatsApp
                  </MagneticLink>
                  <MagneticLink href="/portfolio" className={btnGhost}>
                    See our work <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </MagneticLink>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <FaqList faqs={GENERAL_FAQS} />
              </Reveal>
            </div>
          </section>
        </main>
      </EnquiryProvider>
      <MarketingFooter />
    </MotionRoot>
  );
}
