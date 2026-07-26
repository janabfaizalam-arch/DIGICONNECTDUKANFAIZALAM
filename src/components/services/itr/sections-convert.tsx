"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Star,
  X,
} from "lucide-react";
import type {
  ItrBanner,
  ItrComparisonRow,
  ItrFaq,
  ItrPricingPlan,
  ItrRelatedService,
  ItrReview,
  ItrSection,
} from "@/lib/itr/types";
import {
  CtaButton,
  DisclaimerText,
  GlassCard,
  SectionBanners,
  SectionShell,
  WhatsAppIcon,
  type ItrSectionContext,
} from "./shared";

const SELF_VS_EXPERT_ROWS = [
  { feature: "Form selection", expert: "Expert confirms after document review", self: "You choose the form yourself" },
  { feature: "Income mapping", expert: "Guided schedules & cross-checks", self: "Manual entry on portal" },
  { feature: "Document review", expert: "Pre-filing expert review", self: "Self-verification only" },
  { feature: "Error checks", expert: "AIS / 26AS mismatch screening", self: "Limited automated checks" },
  { feature: "Support", expert: "WhatsApp & portal tracking", self: "No dedicated support" },
  { feature: "Turnaround", expert: "2–3 working days (typical)", self: "Depends on your pace" },
];

export function ItrPricingSection({
  section,
  ctx,
  banners,
  plans,
}: {
  section: ItrSection;
  ctx: ItrSectionContext;
  banners: ItrBanner[];
  plans: ItrPricingPlan[];
}) {
  const activePlans = plans.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <SectionShell section={section} id="pricing" altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {activePlans.map((plan) => (
          <GlassCard
            key={plan.planKey}
            className={`p-6 flex flex-col ${
              plan.isFeatured ? "ring-2 ring-sky-500/80 shadow-[0_16px_40px_rgba(14,165,233,0.12)]" : ""
            }`}
          >
            {plan.isFeatured && (
              <span className="self-start mb-3 text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-1 rounded-full border border-sky-100">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            {plan.description && <p className="text-sm text-slate-500 mt-1 mb-4">{plan.description}</p>}
            <div className="flex items-baseline gap-2 mb-5">
              {plan.price > 0 ? (
                <>
                  <span className="text-3xl font-heading font-bold text-slate-900">
                    ₹{plan.price.toLocaleString("en-IN")}
                  </span>
                  {plan.oldPrice != null && (
                    <span className="text-sm text-slate-400 line-through">
                      ₹{plan.oldPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-2xl font-heading font-bold text-slate-900">Custom quote</span>
              )}
            </div>
            <ul className="space-y-2.5 mb-6 grow">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <CtaButton
              href={ctx.applyUrl}
              label={plan.ctaLabel || "Choose plan"}
              variant={plan.isFeatured ? "primary" : "secondary"}
              className="w-full"
            />
          </GlassCard>
        ))}
      </div>
      <DisclaimerText text={ctx.pricingDisclaimer} />
      <DisclaimerText text={ctx.taxLiabilityDisclaimer} />
      <DisclaimerText text={ctx.refundDisclaimer} />
      {section.ctaLabel && section.ctaUrl && (
        <div className="text-center pt-2">
          <Link href={section.ctaUrl} className="text-sky-600 font-semibold hover:text-sky-700 inline-flex items-center gap-1">
            {section.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </SectionShell>
  );
}

export function ItrSelfVsExpertSection({
  section,
  banners,
  rows,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  rows: ItrComparisonRow[];
}) {
  const comparisonRows =
    rows.filter((r) => r.isActive && r.digiconnect && r.selfFiling).length > 0
      ? rows
          .filter((r) => r.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) => ({
            feature: r.feature,
            expert: r.digiconnect || "",
            self: r.selfFiling || "",
          }))
      : SELF_VS_EXPERT_ROWS;

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="overflow-x-auto rounded-[22px] border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left p-4 font-semibold text-slate-700">Aspect</th>
              <th className="text-left p-4 font-semibold text-sky-700">Expert-assisted</th>
              <th className="text-left p-4 font-semibold text-slate-500">Self filing</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature} className="border-t border-slate-100">
                <td className="p-4 font-medium text-slate-800">{row.feature}</td>
                <td className="p-4 text-emerald-700 font-medium">
                  <span className="inline-flex items-start gap-1.5">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    {row.expert}
                  </span>
                </td>
                <td className="p-4 text-slate-500">
                  <span className="inline-flex items-start gap-1.5">
                    <X className="h-4 w-4 shrink-0 mt-0.5 text-slate-300" />
                    {row.self}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

export function ItrReviewsSection({
  section,
  banners,
  reviews,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  reviews: ItrReview[];
}) {
  const activeReviews = reviews
    .filter((r) => r.isActive && !r.isDemo)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (activeReviews.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeReviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeReviews.length]);

  if (!activeReviews.length) return null;
  const review = activeReviews[current];

  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="max-w-3xl mx-auto">
        <GlassCard className="p-8 md:p-10">
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(review.rating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
              />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={review.name + current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-slate-600 leading-relaxed text-base md:text-lg">&ldquo;{review.text}&rdquo;</p>
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {review.name}
                    {review.isVerified && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Verified
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[review.location, review.filingCategory].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          {activeReviews.length > 1 && (
            <div className="flex gap-2 mt-6">
              {activeReviews.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={`h-2 rounded-full transition-all ${idx === current ? "w-6 bg-sky-600" : "w-2 bg-slate-200"}`}
                  aria-label={`Go to review ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </SectionShell>
  );
}

export function ItrFaqSection({
  section,
  banners,
  faqs,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  faqs: ItrFaq[];
}) {
  const activeFaqs = faqs.filter((f) => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SectionShell section={section} id="faq" altBg>
      <SectionBanners banners={banners} />
      <div className="max-w-3xl mx-auto space-y-3">
        {activeFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const panelId = `itr-faq-panel-${idx}`;
          const buttonId = `itr-faq-button-${idx}`;
          return (
            <GlassCard key={faq.question} className="overflow-hidden">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenIndex(isOpen ? null : idx);
                  }
                }}
                className="w-full p-5 flex items-center justify-between text-left font-semibold text-slate-800 hover:text-slate-950 text-sm md:text-base transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-300 shrink-0 ml-3 ${
                    isOpen ? "rotate-180 text-sky-600" : ""
                  }`}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="px-5 pb-5 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-50">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function ItrCtaSection({
  section,
  ctx,
  banners,
}: {
  section: ItrSection;
  ctx: ItrSectionContext;
  banners: ItrBanner[];
}) {
  const ctaLabel = section.ctaLabel || "Apply for ITR Filing";
  const ctaUrl = section.ctaUrl || ctx.applyUrl;

  return (
    <section id="cta" className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <SectionBanners banners={banners} lazy />
        <GlassCard className="p-10 md:p-14 text-center bg-gradient-to-br from-sky-50/80 via-white to-emerald-50/50">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 tracking-tight">
            {section.heading}
          </h2>
          {section.description && (
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto text-base md:text-lg">{section.description}</p>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <CtaButton href={ctaUrl} label={ctaLabel} />
            <a
              href={ctx.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 md:h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[15px]"
            >
              <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
              WhatsApp
            </a>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

export function ItrRelatedSection({
  section,
  banners,
  related,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  related: ItrRelatedService[];
}) {
  const items = related.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Link key={item.serviceSlug} href={`/services/${item.serviceSlug}`} className="group">
            <GlassCard className="p-5 h-full hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-shadow">
              <h3 className="font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                {item.title || item.serviceSlug}
              </h3>
              {item.description && <p className="text-sm text-slate-500 mt-2">{item.description}</p>}
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 mt-4">
                View service <ArrowRight className="h-4 w-4" />
              </span>
            </GlassCard>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
