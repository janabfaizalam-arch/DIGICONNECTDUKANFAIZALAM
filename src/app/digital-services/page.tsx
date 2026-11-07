import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { MotionRoot, Reveal, Stagger, StaggerItem } from "@/components/homepage/motion";
import { Accent, btnGhostDark, btnPrimary, Eyebrow, SectionTitle } from "@/components/packages/parts";
import { FadeUp, MagneticLink, RiseText } from "@/components/portfolio/interactive";
import { formatAddonPrice } from "@/lib/digital-plans/money";
import { DIGITAL_SERVICES, SERVICE_CATEGORIES, serviceAvailability } from "@/lib/digital-plans/services";
import { getCachedDigitalCatalogue } from "@/lib/homepage/cached";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rnos.in";
const TITLE = "Digital Services | RNOS Digital — Websites, Software, SEO & Marketing";
const DESCRIPTION =
  "RNOS Digital's complete service catalogue: website and e-commerce development, custom software, CRM dashboards, API integrations, WhatsApp automation, SEO, Meta and social media, branding and maintenance.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/digital-services" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: `${siteUrl}/digital-services`, siteName: "RNOS India Pvt. Ltd.", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const whatsappUrl = buildWhatsAppUrl("Hello RNOS Digital, I would like to discuss a digital project for my business.");

export default async function DigitalServicesPage() {
  const { plans, addons } = await getCachedDigitalCatalogue();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Digital Services", item: `${siteUrl}/digital-services` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "RNOS Digital services",
      itemListElement: DIGITAL_SERVICES.map((service, index) => ({ "@type": "ListItem", position: index + 1, name: service.name, description: service.description })),
    },
  ];

  return (
    <MotionRoot>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main-content" className="overflow-x-clip bg-white">
        <section aria-labelledby="ds-title" className="relative isolate overflow-hidden bg-[var(--dc-blue-deep)] text-white">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(17,112,221,0.5),transparent_62%),radial-gradient(45%_40%_at_95%_100%,rgba(247,74,1,0.2),transparent_70%),linear-gradient(180deg,#001536_0%,#012456_55%,#013a8e_100%)]" />
          <div className="mx-auto max-w-[var(--dc-max)] px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pb-24">
            <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/55">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-white">Home</Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/80">Digital Services</li>
              </ol>
            </nav>
            <div className="mt-12 max-w-4xl">
              <FadeUp>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white/80 ring-1 ring-white/15">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dc-amber)]" />
                  RNOS Digital · Services
                </p>
              </FadeUp>
              <h1 id="ds-title" className="mt-7 font-[family-name:var(--font-heading)] text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
                <RiseText text="One agency for" className="block" />
                <span className="block bg-gradient-to-r from-[#ffb057] via-[var(--dc-amber)] to-[var(--dc-flame)] bg-clip-text pb-2 text-transparent">
                  <RiseText text="everything digital." className="font-[family-name:var(--font-display)] font-normal italic tracking-[-0.02em]" delay={0.18} />
                </span>
              </h1>
              <FadeUp delay={0.45}>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
                  Websites, software, marketing and maintenance for every kind of Indian business — taken as a monthly plan or one service at a time.
                </p>
              </FadeUp>
              <FadeUp delay={0.6} className="mt-9 flex flex-wrap gap-3">
                <MagneticLink href="/packages" className={btnPrimary}>
                  See plans & pricing <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </MagneticLink>
                <MagneticLink href="/portfolio" className={btnGhostDark}>
                  Explore our work
                </MagneticLink>
              </FadeUp>
            </div>
          </div>
        </section>

        {SERVICE_CATEGORIES.map((category, categoryIndex) => {
          const services = DIGITAL_SERVICES.filter((service) => service.category === category.id);
          return (
            <section
              key={category.id}
              aria-labelledby={`ds-${category.id}`}
              className={categoryIndex % 2 ? "border-y border-slate-900/5 bg-[var(--dc-sky-soft)]" : ""}
            >
              <div className="mx-auto grid max-w-[var(--dc-max)] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-10 lg:py-24">
                <Reveal className="lg:sticky lg:top-28 lg:self-start">
                  <Eyebrow>{String(categoryIndex + 1).padStart(2, "0")} · {category.label}</Eyebrow>
                  <SectionTitle id={`ds-${category.id}`}>
                    <Accent>{category.blurb}</Accent>
                  </SectionTitle>
                </Reveal>
                <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
                  {services.map((service) => {
                    const { plans: inPlans, addons: asAddons } = serviceAvailability(service, plans, addons);
                    return (
                      <StaggerItem as="li" key={service.slug} className="h-full">
                        <div id={service.slug} className="flex h-full scroll-mt-28 flex-col rounded-[24px] bg-white p-6 ring-1 ring-slate-900/[0.07] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-36px_rgba(1,29,95,0.45)] motion-reduce:transform-none">
                          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.03em] text-[var(--dc-ink)]">{service.name}</h3>
                          <p className="mt-2 flex-1 text-[15px] leading-7 text-[var(--dc-body)]">{service.description}</p>
                          {inPlans.length ? (
                            <div className="mt-5">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dc-muted)]">Included in</p>
                              <ul className="mt-2 flex flex-wrap gap-1.5">
                                {inPlans.map((plan) => (
                                  <li key={plan.slug}>
                                    <Link href={`/packages/${plan.slug}`} className="inline-flex rounded-full bg-[var(--dc-blue-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--dc-brand-navy)] hover:bg-[#d7e5ff]">
                                      {plan.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {asAddons.length ? (
                            <p className="mt-4 text-sm text-[var(--dc-body)]">
                              On its own:{" "}
                              {asAddons.map((addon, index) => (
                                <span key={addon.slug}>
                                  {index ? ", " : ""}
                                  {addon.name} <strong className="font-semibold text-[var(--dc-ink)]">{formatAddonPrice(addon.pricePaise, addon.unit, addon.priceIsStarting)}</strong>
                                </span>
                              ))}
                            </p>
                          ) : null}
                          {!inPlans.length && !asAddons.length ? <p className="mt-4 text-sm text-[var(--dc-body)]">Quoted to your scope.</p> : null}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </div>
            </section>
          );
        })}

        <section aria-labelledby="ds-cta" className="px-4 pb-20 pt-4 sm:px-6 lg:px-10">
          <Reveal>
            <div className="relative isolate mx-auto max-w-[var(--dc-max)] overflow-hidden rounded-[36px] bg-[var(--dc-blue-deep)] px-6 py-16 text-center text-white sm:px-12 lg:py-20">
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(17,112,221,0.6),transparent_70%)]" />
              <h2 id="ds-cta" className="mx-auto max-w-3xl font-[family-name:var(--font-heading)] text-[clamp(2rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.05em]">
                Not sure where to <Accent>start?</Accent>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/75">Tell us what your business needs and we will suggest the plan or services that fit — and say so if a smaller one is enough.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <MagneticLink href={whatsappUrl} external className={btnPrimary} aria-label="Talk to us on WhatsApp (opens in a new tab)">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Talk to us
                </MagneticLink>
                <MagneticLink href="/packages#compare" className={btnGhostDark}>
                  Compare plans <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </MagneticLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <MarketingFooter />
    </MotionRoot>
  );
}
