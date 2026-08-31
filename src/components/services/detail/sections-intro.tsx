"use client";

import Image from "next/image";
import { BadgeCheck, Clock3, Landmark, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { m } from "framer-motion";

import { ShareServiceMenu } from "@/components/share-service-menu";
import {
  ServiceBreadcrumb,
  ServiceCard,
  ServiceCta,
  ServiceIcon,
  ServiceSection,
  WhatsAppIcon,
} from "@/components/services/shell";
import type { ServiceDetail } from "@/lib/services/detail-blueprint";

/* ─────────────────────────────────────────────────────────────────────────
   1 — Hero
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The first screen: what this is, what it costs, and the one thing to do next.
 *
 * Built on the same blue ramp and jaali the homepage hero and the two
 * dedicated service pages use, so arriving on a service page from anywhere on
 * the site feels like staying on the site rather than landing on a template.
 */
export function ServiceHeroSection({ detail, isLoggedIn }: { detail: ServiceDetail; isLoggedIn: boolean }) {
  const { service, heroImage, applyHref, whatsappHref, price } = detail;

  return (
    <section
      id="hero"
      className="dc-ambient relative isolate overflow-hidden text-white"
      style={{ background: "var(--dc-grad-blue)" }}
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-jaali absolute inset-0 opacity-[0.07]" />
        <div className="dc-orb dc-orb-flame lg-drift-slow -right-[14%] -top-[36%] h-[36rem] w-[36rem] opacity-55" />
      </div>

      <div className="relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] py-9 sm:px-6 sm:py-14 md:px-8">
        <ServiceBreadcrumb current={service.title} />

        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <m.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg-pill-dark lg-raise-dark inline-flex items-center gap-2 py-1.5 pl-2 pr-4 text-[11px] font-bold sm:text-xs"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--dc-grad-flame)" }}
              >
                <Landmark className="h-3 w-3 text-white" aria-hidden="true" />
              </span>
              {service.category}
            </m.span>

            <m.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-4 text-balance text-[1.85rem] font-extrabold leading-[1.07] tracking-[-0.028em] sm:mt-5 sm:text-[2.8rem] lg:text-[3.1rem]"
            >
              {service.title}
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
              className="mt-3 max-w-[58ch] text-pretty text-[13.5px] font-medium leading-[1.6] text-white/72 sm:mt-4 sm:text-[16.5px]"
            >
              {service.shortDescription}
            </m.p>

            {/* A figure at the size of a figure — and, where there is none,
                a sentence rather than a call to action dressed up as one. */}
            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-6"
            >
              {price.quoted ? (
                <>
                  <span className="text-[1.6rem] font-extrabold tracking-[-0.02em] sm:text-[2.1rem]">
                    {price.display}
                  </span>
                  {price.strikethrough ? (
                    <span className="text-[13px] font-bold text-white/45 line-through sm:text-[15px]">
                      {price.strikethrough}
                    </span>
                  ) : null}
                  <span className="text-[11.5px] font-semibold text-white/55 sm:text-[13px]">
                    Government fees, where they apply, are charged separately.
                  </span>
                </>
              ) : (
                <span className="text-[13px] font-semibold text-white/72 sm:text-[15px]">
                  Priced case by case — tell us what you need and we will quote before any work starts.
                </span>
              )}
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center"
            >
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
                Ask on WhatsApp
              </a>
              <ShareServiceMenu serviceName={service.title} serviceSlug={service.slug} />
            </m.div>
          </div>

          <m.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="lg:col-span-5"
          >
            {heroImage ? (
              <div className="lg-card-dark relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={heroImage}
                  alt={service.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <ServiceCard dark className="p-5 sm:p-6">
                <ServiceIcon tone="flame">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </ServiceIcon>
                <h2 className="mt-4 text-[16px] font-extrabold text-white sm:text-[18px]">
                  Filed by a person, not a form
                </h2>
                <p className="mt-2 text-[13px] font-medium leading-[1.6] text-white/70">
                  You send the details once. We check the documents, file on the department portal, and tell you
                  where it has reached — in your dashboard and on WhatsApp.
                </p>
              </ServiceCard>
            )}
          </m.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   2 — Trust bar
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The strip under the hero.
 *
 * Four statements about how the service actually works, and not one number.
 * A count of happy customers under a hero is the cheapest thing on a page and
 * the first thing a careful buyer discounts; each of these is something a
 * customer can check for themselves within a minute of applying.
 */
const TRUST_POINTS = [
  {
    icon: Lock,
    title: "Your documents stay private",
    note: "Uploaded over an encrypted connection and seen only by the person filing.",
  },
  {
    icon: BadgeCheck,
    title: "Checked before filing",
    note: "Documents are read and verified before anything is submitted.",
  },
  {
    icon: Clock3,
    title: "Status you can see",
    note: "Every stage appears in your dashboard as it happens.",
  },
  {
    icon: MessageCircle,
    title: "A person on WhatsApp",
    note: "Ask anything mid-application and get a reply from the same desk.",
  },
] as const;

export function ServiceTrustBar() {
  return (
    <ServiceSection id="trust" surface="white" eager wash="none" className="!py-6 sm:!py-8">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_POINTS.map(({ icon: Icon, title, note }) => (
          <li key={title}>
            <ServiceCard className="h-full p-4 sm:p-5">
              <ServiceIcon>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </ServiceIcon>
              <p className="mt-3 text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)]">{title}</p>
              <p className="mt-1.5 text-[12.5px] font-medium leading-[1.55] text-[var(--dc-body)]">{note}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3 — Quick facts
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The answers somebody wants before deciding to read the page at all: what it
 * costs, how long it takes, how many documents, how to start.
 *
 * Only facts the service row actually carries. A turnaround appears when
 * `tat_hours` is set and is left out when it is not, rather than defaulted to
 * a number that would be a guess.
 */
export function ServiceQuickFacts({ detail }: { detail: ServiceDetail }) {
  if (!detail.facts.length) return null;

  return (
    <ServiceSection id="quick-facts" surface="sky" eager>
      <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {detail.facts.map((fact) => (
          <div key={fact.label} className="lg-card px-4 py-4 text-center sm:py-5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
              {fact.label}
            </dt>
            <dd className="mt-1.5 text-[14px] font-extrabold leading-tight text-[var(--dc-ink)] sm:text-[15.5px]">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </ServiceSection>
  );
}
