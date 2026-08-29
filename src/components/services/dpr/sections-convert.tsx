"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Minus,
  Phone,
  Quote,
  Star,
  X,
} from "lucide-react";

import { DPR_PROCESS_STEPS, DPR_SAMPLE_PREVIEWS } from "@/lib/dpr/defaults";
import type {
  DprArticleCard,
  DprBanner,
  DprComparisonRow,
  DprFaq,
  DprPricingPlan,
  DprRelatedService,
  DprReview,
  DprSection,
} from "@/lib/dpr/types";
import {
  CtaButton,
  DprIcon,
  GlassCard,
  SectionBanners,
  SectionShell,
  WhatsAppIcon,
  type DprSectionContext,
} from "./shared";

/* ─────────────────────────────────────────────────────────────────────────
   Pricing
   ───────────────────────────────────────────────────────────────────────── */

export function DprPricingSection({
  section,
  ctx,
  banners,
  plans,
}: {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
  plans: DprPricingPlan[];
}) {
  const activePlans = plans.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!activePlans.length) return null;

  return (
    <SectionShell section={section} id="pricing" surface="sky">
      <SectionBanners banners={banners} />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {activePlans.map((plan) => (
          <li key={plan.planKey} className="h-full">
            {/*
              The featured plan is painted, not tinted.

              `lg-card-dark` is a translucent surface meant for a dark band; on
              this light one it came out near-white with white text on it and
              the plan was unreadable. The highlighted card carries the logo's
              blue ramp as a real background instead, which is also what makes
              it read as the chosen one at a glance.
            */}
            <div
              className={
                plan.isFeatured
                  ? "h-full overflow-hidden rounded-[var(--lg-radius)] ring-1 ring-[var(--dc-amber)]/40 shadow-[0_22px_50px_-24px_rgba(1,36,86,0.85)]"
                  : "lg-card lg-raise lg-sheen h-full overflow-hidden"
              }
              style={plan.isFeatured ? { background: "var(--dc-grad-blue)" } : undefined}
            >
              <div className="flex h-full flex-col p-4 sm:p-5">
                {plan.isFeatured ? (
                  <span
                    className="mb-3 self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white"
                    style={{ background: "var(--dc-grad-flame)" }}
                  >
                    Most chosen
                  </span>
                ) : null}

                <h3
                  className={`text-[15px] font-extrabold sm:text-[17px] ${
                    plan.isFeatured ? "text-white" : "text-[var(--dc-ink)]"
                  }`}
                >
                  {plan.name}
                </h3>
                {plan.description ? (
                  <p
                    className={`mt-1 text-[12.5px] font-medium leading-[1.55] ${
                      plan.isFeatured ? "text-white/65" : "text-[var(--dc-body)]"
                    }`}
                  >
                    {plan.description}
                  </p>
                ) : null}

                <p className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`text-[1.75rem] font-extrabold leading-none ${
                      plan.isFeatured ? "text-white" : "text-[var(--dc-ink)]"
                    }`}
                  >
                    ₹{plan.price.toLocaleString("en-IN")}
                  </span>
                  {plan.oldPrice != null ? (
                    <span
                      className={`text-[13px] font-bold line-through ${
                        plan.isFeatured ? "text-white/40" : "text-[var(--dc-muted)]"
                      }`}
                    >
                      ₹{plan.oldPrice.toLocaleString("en-IN")}
                    </span>
                  ) : null}
                </p>

                <ul className="mt-4 grow space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.isFeatured ? "text-[var(--dc-amber)]" : "text-[var(--dc-flame)]"
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-[12.5px] font-medium leading-[1.5] ${
                          plan.isFeatured ? "text-white/80" : "text-[var(--dc-body)]"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <CtaButton
                  href={ctx.applyUrl}
                  label={plan.ctaLabel || "Choose plan"}
                  variant={plan.isFeatured ? "primary" : "ghost"}
                  icon={false}
                  className="mt-5 w-full"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-[12.5px] font-medium text-[var(--dc-muted)]">
        Every plan is a one-time fee. Nothing renews, and nothing is charged before you review the summary.
      </p>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Comparison
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The comparison table.
 *
 * A table on a 390px screen is a horizontal scrollbar nobody finds, so on a
 * phone the same rows are rendered as one card per feature. Both come from
 * the same admin-edited data.
 */
export function DprComparisonSection({
  section,
  banners,
  rows,
}: {
  section: DprSection;
  banners: DprBanner[];
  rows: DprComparisonRow[];
}) {
  const activeRows = rows.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!activeRows.length) return null;

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />

      {/* Phone: one card per row. */}
      <ul className="grid gap-2.5 sm:hidden">
        {activeRows.map((row) => (
          <li key={row.feature}>
            <GlassCard className="p-3.5">
              <p className="text-[13px] font-extrabold text-[var(--dc-ink)]">{row.feature}</p>
              <dl className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[var(--dc-sky-soft)] p-2.5">
                  <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-blue-mid)]">
                    DigiConnect
                  </dt>
                  <dd className="mt-1 flex items-start gap-1.5 text-[12px] font-bold leading-snug text-[var(--dc-ink)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                    {row.digiconnect}
                  </dd>
                </div>
                <div className="rounded-xl bg-black/[0.03] p-2.5">
                  <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    Elsewhere
                  </dt>
                  <dd className="mt-1 flex items-start gap-1.5 text-[12px] font-medium leading-snug text-[var(--dc-muted)]">
                    <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {row.others}
                  </dd>
                </div>
              </dl>
            </GlassCard>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the table. */}
      <div className="hidden overflow-x-auto sm:block">
        <GlassCard interactive={false} className="min-w-[640px]">
          <table className="w-full text-left text-[13.5px]">
            <caption className="sr-only">{section.heading || "How DigiConnect compares"}</caption>
            <thead>
              <tr className="bg-[var(--dc-sky-soft)]">
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-ink)]">
                  What you get
                </th>
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-blue-mid)]">
                  DigiConnect Dukan
                </th>
                <th scope="col" className="p-4 font-extrabold text-[var(--dc-muted)]">
                  Elsewhere
                </th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.feature} className="border-t border-black/5">
                  <th scope="row" className="p-4 text-left font-bold text-[var(--dc-ink)]">
                    {row.feature}
                  </th>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 font-bold text-[var(--dc-ink)]">
                      <Check className="h-4 w-4 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                      {row.digiconnect}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 font-medium text-[var(--dc-muted)]">
                      <X className="h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                      {row.others}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Process
   ───────────────────────────────────────────────────────────────────────── */

export function DprProcessSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} surface="sky">
      <SectionBanners banners={banners} />
      <ol className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {DPR_PROCESS_STEPS.map((step) => (
          <li key={step.step}>
            <GlassCard className="h-full p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                  style={{ background: "var(--dc-grad-blue)" }}
                >
                  {step.step}
                </span>
                <h3 className="min-w-0 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {step.title}
                </h3>
              </div>
              <p className="mt-2.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                {step.detail}
              </p>
            </GlassCard>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sample previews
   ───────────────────────────────────────────────────────────────────────── */

export function DprSamplesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-4">
        {DPR_SAMPLE_PREVIEWS.map((sample) => (
          <li key={sample.title}>
            <GlassCard className="h-full p-4 text-center sm:p-6">
              {/* A stylised page rather than a photo: no sample document is
                  published, so nothing here pretends to be one. */}
              <span
                aria-hidden="true"
                className="mx-auto flex h-16 w-12 flex-col justify-center gap-1.5 rounded-md border border-black/10 bg-white p-2 shadow-[0_8px_20px_-12px_rgba(1,36,86,0.5)]"
              >
                <span className="block h-1 w-full rounded-full bg-[var(--dc-blue-bright)]/60" />
                <span className="block h-1 w-3/4 rounded-full bg-black/10" />
                <span className="block h-1 w-full rounded-full bg-black/10" />
                <span className="block h-1 w-2/3 rounded-full bg-[var(--dc-flame)]/50" />
              </span>
              <h3 className="mt-3.5 text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                {sample.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                {sample.detail}
              </p>
            </GlassCard>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Reviews
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Customer reviews.
 *
 * Every review shown here is one an administrator entered from a real
 * customer. There are no seeded testimonials behind this: with an empty list
 * the band does not render at all, because an invented review on a page
 * selling a loan document is worse than no review.
 */
export function DprReviewsSection({
  section,
  banners,
  reviews,
}: {
  section: DprSection;
  banners: DprBanner[];
  reviews: DprReview[];
}) {
  const activeReviews = reviews.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (activeReviews.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeReviews.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [activeReviews.length]);

  if (!activeReviews.length) return null;
  const review = activeReviews[Math.min(current, activeReviews.length - 1)];

  return (
    <SectionShell section={section} surface="sky">
      <SectionBanners banners={banners} />
      <div className="mx-auto max-w-3xl">
        <GlassCard className="p-5 sm:p-8" interactive={false}>
          <div className="flex items-start justify-between gap-4">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--dc-grad-flame)" }}
            >
              <Quote className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex gap-0.5" aria-label={`Rated ${review.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(review.rating)
                      ? "fill-[var(--dc-amber)] text-[var(--dc-amber)]"
                      : "text-black/15"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <m.blockquote
              key={`${review.name}-${current}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="mt-4 text-[14.5px] font-medium leading-[1.65] text-[var(--dc-ink)] sm:text-[17px]">
                {review.text}
              </p>
              <footer className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                  style={{ background: "var(--dc-grad-blue)" }}
                  aria-hidden="true"
                >
                  {review.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <cite className="block truncate text-[13.5px] font-extrabold not-italic text-[var(--dc-ink)]">
                    {review.name}
                  </cite>
                  {review.location ? (
                    <span className="block truncate text-[12px] font-medium text-[var(--dc-muted)]">
                      {review.location}
                    </span>
                  ) : null}
                </span>
              </footer>
            </m.blockquote>
          </AnimatePresence>

          {activeReviews.length > 1 ? (
            <div className="mt-5 flex gap-1.5">
              {activeReviews.map((item, index) => (
                <button
                  key={item.id ?? item.name}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current ? "w-6 bg-[var(--dc-flame)]" : "w-2 bg-black/12"
                  }`}
                  aria-label={`Show review ${index + 1} of ${activeReviews.length}`}
                  aria-current={index === current}
                />
              ))}
            </div>
          ) : null}
        </GlassCard>
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Success stories
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What a finished report looks like for three kinds of unit.
 *
 * These describe the *deliverable* — which chapters a manufacturing file
 * needs versus a service one — and not outcomes. Nothing here claims a
 * sanctioned loan on a customer's behalf.
 */
export function DprSuccessSection({
  section,
  banners,
  stories,
}: {
  section: DprSection;
  banners: DprBanner[];
  stories: { title: string; detail: string }[];
}) {
  if (!stories.length) return null;

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ul className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3 sm:gap-4">
        {stories.map((story, index) => (
          <li key={story.title}>
            <GlassCard className="h-full p-4 sm:p-5">
              <DprIcon tone={index === 1 ? "flame" : "blue"}>
                <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
              </DprIcon>
              <h3 className="mt-3.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                {story.title}
              </h3>
              <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                {story.detail}
              </p>
            </GlassCard>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Articles
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Long-form guides, pulled from the site's own blog.
 *
 * Real published articles only — there is no seeded list behind this, so the
 * band disappears until something is actually published to link to.
 */
export function DprArticlesSection({
  section,
  banners,
  articles,
}: {
  section: DprSection;
  banners: DprBanner[];
  articles: DprArticleCard[];
}) {
  if (!articles.length) return null;

  return (
    <SectionShell section={section} surface="sky" center={false}>
      <SectionBanners banners={banners} />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/blog/${article.slug}`} className="group block h-full focus-visible:outline-none">
              <GlassCard className="flex h-full flex-col">
                {article.imageUrl ? (
                  <span className="relative block aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={article.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  </span>
                ) : (
                  <span
                    className="flex aspect-[16/9] w-full items-center justify-center"
                    style={{ background: "var(--dc-grad-blue)" }}
                    aria-hidden="true"
                  >
                    <BookOpen className="h-8 w-8 text-white/70" />
                  </span>
                )}

                <span className="flex flex-1 flex-col p-4 sm:p-5">
                  {article.category ? (
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--dc-flame)]">
                      {article.category}
                    </span>
                  ) : null}
                  <h3 className="mt-1.5 line-clamp-2 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                    {article.title}
                  </h3>
                  {article.excerpt ? (
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13px]">
                      {article.excerpt}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[12.5px] font-extrabold text-[var(--dc-blue-mid)]">
                    Read the guide
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </GlassCard>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 text-center">
        <CtaButton href="/blog" label="All guides & articles" variant="ghost" icon={false} />
      </div>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────────────────── */

export function DprFaqSection({
  section,
  banners,
  faqs,
}: {
  section: DprSection;
  banners: DprBanner[];
  faqs: DprFaq[];
}) {
  const activeFaqs = faqs.filter((f) => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!activeFaqs.length) return null;

  return (
    <SectionShell section={section} id="faq">
      <SectionBanners banners={banners} />
      <ul className="mx-auto max-w-3xl space-y-2.5">
        {activeFaqs.map((faq, index) => {
          const isOpen = openIndex === index;
          const panelId = `dpr-faq-panel-${index}`;
          const buttonId = `dpr-faq-button-${index}`;
          return (
            <li key={faq.question}>
              <GlassCard interactive={false}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left text-[13.5px] font-extrabold text-[var(--dc-ink)] transition-colors hover:text-[var(--dc-blue-mid)] sm:p-5 sm:text-[15px]"
                  >
                    <span className="min-w-0">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--dc-muted)] transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[var(--dc-flame)]" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <m.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-black/5 px-4 pb-4 pt-3.5 text-[12.5px] font-medium leading-[1.65] text-[var(--dc-body)] sm:px-5 sm:pb-5 sm:text-[13.5px]">
                        {faq.answer}
                      </p>
                    </m.div>
                  ) : null}
                </AnimatePresence>
              </GlassCard>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Closing CTA
   ───────────────────────────────────────────────────────────────────────── */

export function DprCtaSection({
  section,
  ctx,
  banners,
  launchPrice,
}: {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
  launchPrice: number;
}) {
  const ctaLabel = section.ctaLabel || "Apply now";
  const ctaUrl = section.ctaUrl || ctx.applyUrl;

  return (
    <section
      id="cta"
      className="dc-ambient relative overflow-hidden px-[var(--mobile-page-gutter)] py-8 sm:px-6 sm:py-14 md:px-8 md:py-20"
      style={{ background: "var(--dc-grad-blue)" }}
      aria-labelledby="dpr-cta-heading"
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-jaali absolute inset-0 opacity-[0.06]" />
        <div className="dc-orb dc-orb-flame lg-drift-slow -left-[10%] -top-[40%] h-[30rem] w-[30rem] opacity-50" />
      </div>

      <div className="relative mx-auto w-full max-w-[var(--dc-max)] text-center text-white">
        <SectionBanners banners={banners} />
        <h2
          id="dpr-cta-heading"
          className="mx-auto max-w-[20ch] text-balance text-[1.35rem] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[2rem] md:text-[2.3rem]"
        >
          {section.heading || "Ready to get your project report?"}
        </h2>
        {section.description ? (
          <p className="mx-auto mt-2 max-w-2xl text-[13.5px] font-medium leading-[1.6] text-white/72 sm:mt-3 sm:text-[15.5px]">
            {section.description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-row justify-center gap-2 sm:mt-7 sm:gap-3">
          <CtaButton
            href={ctaUrl}
            label={ctaLabel}
            variant="primary"
            className="flex-1 sm:flex-none"
          />
          <CtaButton
            href={ctx.whatsappUrl}
            label="WhatsApp"
            variant="ghostDark"
            external
            className="flex-1 sm:flex-none"
          />
        </div>

        <p className="mt-4 text-[12px] font-semibold text-white/55">
          Launch offer ₹{launchPrice.toLocaleString("en-IN")} · secure payment · tracked in your portal
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Related services
   ───────────────────────────────────────────────────────────────────────── */

export function DprRelatedSection({
  section,
  banners,
  related,
}: {
  section: DprSection;
  banners: DprBanner[];
  related: DprRelatedService[];
}) {
  const items = related.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!items.length) return null;

  return (
    <SectionShell section={section} surface="sky" center={false}>
      <SectionBanners banners={banners} />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.serviceSlug}>
            <Link
              href={`/services/${item.serviceSlug}`}
              className="group block h-full focus-visible:outline-none"
            >
              <GlassCard className="flex h-full flex-col p-4 sm:p-5">
                <h3 className="text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                  {item.title || item.serviceSlug}
                </h3>
                {item.description ? (
                  <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                    {item.description}
                  </p>
                ) : null}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[12.5px] font-extrabold text-[var(--dc-blue-mid)]">
                  View service
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </GlassCard>
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Contact
   ───────────────────────────────────────────────────────────────────────── */

export function DprContactSection({
  section,
  ctx,
  banners,
}: {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
}) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
        <a href={ctx.whatsappUrl} target="_blank" rel="noopener noreferrer" className="group block">
          <GlassCard className="flex h-full items-center gap-3.5 p-4 sm:p-5">
            <DprIcon tone="flame">
              <WhatsAppIcon className="h-[18px] w-[18px]" />
            </DprIcon>
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                WhatsApp an expert
              </span>
              <span className="block text-[12.5px] font-medium text-[var(--dc-body)]">
                Scheme-specific guidance, in your language
              </span>
            </span>
          </GlassCard>
        </a>

        <a href={`tel:${ctx.supportPhone}`} className="group block">
          <GlassCard className="flex h-full items-center gap-3.5 p-4 sm:p-5">
            <DprIcon>
              <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            </DprIcon>
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold text-[var(--dc-ink)] transition-colors group-hover:text-[var(--dc-blue-mid)] sm:text-[15px]">
                Call the team
              </span>
              <span className="block truncate text-[12.5px] font-medium text-[var(--dc-body)]">
                {ctx.supportPhone}
              </span>
            </span>
          </GlassCard>
        </a>
      </div>
    </SectionShell>
  );
}
