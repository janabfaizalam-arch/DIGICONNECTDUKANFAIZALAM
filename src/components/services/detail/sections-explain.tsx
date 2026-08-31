"use client";

import { CheckCircle2, FileCheck2, HeartHandshake, IndianRupee, ScrollText, UserCheck } from "lucide-react";

import { ServiceCard, ServiceIcon, ServiceSection } from "@/components/services/shell";
import type { ServiceDetail } from "@/lib/services/detail-blueprint";

/* ─────────────────────────────────────────────────────────────────────────
   4 — Service overview
   ───────────────────────────────────────────────────────────────────────── */

/** What the service is, in prose, before any list. */
export function ServiceOverviewSection({ detail }: { detail: ServiceDetail }) {
  const overview = detail.overview;
  if (!overview) return null;

  return (
    <ServiceSection id="overview" surface="white" title={overview.title} eyebrow="Overview" center={false}>
      <ServiceCard className="p-5 sm:p-7">
        <p className="whitespace-pre-line text-[13.5px] font-medium leading-[1.75] text-[var(--dc-body)] sm:text-[15.5px]">
          {overview.text}
        </p>
      </ServiceCard>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   5 — Who is it for
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Who should be on this page — and, by omission, who should not.
 *
 * Only rendered when an administrator has written it. Guessing an audience for
 * a service and printing the guess as fact is how a customer ends up paying
 * for a filing they were never eligible for.
 */
export function ServiceWhoIsItForSection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.whoIsItFor;
  if (!slot?.items.length) return null;

  return (
    <ServiceSection id="who-is-it-for" surface="sky" title={slot.title} eyebrow="Right fit">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slot.items.map((item) => (
          <li key={item}>
            <ServiceCard className="flex h-full items-start gap-3 p-4 sm:p-5">
              <ServiceIcon tone="flame">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </ServiceIcon>
              <p className="min-w-0 text-[13.5px] font-semibold leading-[1.55] text-[var(--dc-ink)]">{item}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   6 — Benefits
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceBenefitsSection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.benefits;
  if (!slot?.items.length) return null;

  return (
    <ServiceSection id="benefits" surface="white" title={slot.title} eyebrow="Benefits">
      <ul className="grid gap-3 sm:grid-cols-2">
        {slot.items.map((item) => (
          <li key={item}>
            <ServiceCard className="flex h-full items-start gap-3 p-4 sm:p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-blue-mid)]" aria-hidden="true" />
              <p className="min-w-0 text-[13.5px] font-semibold leading-[1.55] text-[var(--dc-ink)]">{item}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   7 — Why DigiConnect Dukan
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The one band on the page that is about us rather than the service.
 *
 * Four claims, each about how the work is done rather than how well it has
 * gone. There is no "10,000 happy customers" here and there should not be:
 * every number on this site has to be one the business can produce a record
 * for, and this band has no such record behind it.
 */
const WHY_US = [
  {
    icon: HeartHandshake,
    title: "One desk, start to finish",
    body: "The person who checks your documents is the person who files them and the person who answers when you ask where it has reached.",
  },
  {
    icon: FileCheck2,
    title: "Documents checked first",
    body: "Most rejections are a blurred scan or a name that does not match. We read every file before it goes anywhere near a portal.",
  },
  {
    icon: IndianRupee,
    title: "The price you were quoted",
    body: "Our fee is on this page. Where a department charges its own fee, it is named separately rather than folded in quietly.",
  },
  {
    icon: ScrollText,
    title: "Everything in writing",
    body: "Receipts, acknowledgements and the final document all land in your dashboard, so you are not depending on a WhatsApp thread.",
  },
] as const;

export function ServiceWhyUsSection() {
  return (
    <ServiceSection
      id="why-us"
      surface="navy"
      eyebrow="Why us"
      title="Why file through DigiConnect Dukan"
      description="The same filing, done by somebody who is accountable for it."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {WHY_US.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <ServiceCard dark className="h-full p-5 sm:p-6">
              <ServiceIcon tone="flame">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </ServiceIcon>
              <h3 className="mt-4 text-[15px] font-extrabold text-white sm:text-[16.5px]">{title}</h3>
              <p className="mt-2 text-[13px] font-medium leading-[1.6] text-white/70">{body}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   8 — How it works
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The steps, numbered.
 *
 * The old page printed the same invented sentence of filler under every step
 * — "Our team handles submissions, filing, and follow-ups" — which said
 * nothing and said it four times. A step is now just the step.
 */
export function ServiceHowItWorksSection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.howItWorks;
  if (!slot?.items.length) return null;

  return (
    <ServiceSection id="how-it-works" surface="sky" title={slot.title} eyebrow="Process">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slot.items.map((item, index) => (
          <li key={item}>
            <ServiceCard className="h-full p-4 sm:p-5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                style={{ background: "var(--dc-grad-blue)" }}
              >
                {index + 1}
              </span>
              <p className="mt-3 text-[13.5px] font-bold leading-[1.5] text-[var(--dc-ink)]">{item}</p>
            </ServiceCard>
          </li>
        ))}
      </ol>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   9 — Eligibility
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceEligibilitySection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.eligibility;
  if (!slot?.items.length) return null;

  return (
    <ServiceSection
      id="eligibility"
      surface="white"
      title={slot.title}
      eyebrow="Eligibility"
      description="Check these before you pay. If something here does not apply to you, ask us on WhatsApp first."
    >
      <ServiceCard className="p-5 sm:p-7">
        <ul className="grid gap-3 sm:grid-cols-2">
          {slot.items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
              <span className="min-w-0 text-[13.5px] font-semibold leading-[1.55] text-[var(--dc-ink)]">{item}</span>
            </li>
          ))}
        </ul>
      </ServiceCard>
    </ServiceSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   10 — Documents required
   ───────────────────────────────────────────────────────────────────────── */

export function ServiceDocumentsSection({ detail }: { detail: ServiceDetail }) {
  const slot = detail.documents;
  if (!slot?.items.length) return null;

  return (
    <ServiceSection
      id="documents"
      surface="sky"
      title={slot.title}
      eyebrow="Documents"
      description="A phone photo is fine as long as all four corners and the text are readable."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slot.items.map((item) => (
          <li key={item}>
            <ServiceCard className="flex h-full items-center gap-3 p-4 sm:p-5">
              <ServiceIcon>
                <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              </ServiceIcon>
              <p className="min-w-0 text-[13.5px] font-bold leading-snug text-[var(--dc-ink)]">{item}</p>
            </ServiceCard>
          </li>
        ))}
      </ul>
    </ServiceSection>
  );
}
