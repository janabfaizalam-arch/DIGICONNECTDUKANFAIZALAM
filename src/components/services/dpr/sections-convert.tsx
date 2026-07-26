"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Mail,
  Phone,
  Star,
} from "lucide-react";
import { DPR_PROCESS_STEPS, DPR_SAMPLE_PREVIEWS, DPR_SUCCESS_STORIES } from "@/lib/dpr/defaults";
import type {
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
  GlassCard,
  SectionBanners,
  SectionShell,
  WhatsAppIcon,
  type DprSectionContext,
} from "./shared";

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

  return (
    <SectionShell section={section} id="pricing" altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
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
              <span className="text-3xl font-heading font-bold text-slate-900">₹{plan.price.toLocaleString("en-IN")}</span>
              {plan.oldPrice != null && (
                <span className="text-sm text-slate-400 line-through">₹{plan.oldPrice.toLocaleString("en-IN")}</span>
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
      {section.ctaLabel && section.ctaUrl && (
        <div className="text-center pt-4">
          <Link href={section.ctaUrl} className="text-sky-600 font-semibold hover:text-sky-700 inline-flex items-center gap-1">
            {section.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </SectionShell>
  );
}

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

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="overflow-x-auto rounded-[22px] border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left p-4 font-semibold text-slate-700">Feature</th>
              <th className="text-left p-4 font-semibold text-sky-700">DigiConnect</th>
              <th className="text-left p-4 font-semibold text-slate-500">Others</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <tr key={row.feature} className="border-t border-slate-100">
                <td className="p-4 font-medium text-slate-800">{row.feature}</td>
                <td className="p-4 text-emerald-700 font-medium">{row.digiconnect}</td>
                <td className="p-4 text-slate-500">{row.others}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

export function DprProcessSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {DPR_PROCESS_STEPS.map((step) => (
          <GlassCard key={step.step} className="p-5 relative">
            <span className="absolute top-4 right-4 text-2xl font-heading font-bold text-sky-100">
              {String(step.step).padStart(2, "0")}
            </span>
            <h3 className="font-bold text-slate-800 pr-10">{step.title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{step.detail}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprSamplesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {DPR_SAMPLE_PREVIEWS.map((sample) => (
          <GlassCard key={sample.title} className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800">{sample.title}</h3>
            <p className="text-sm text-slate-500 mt-2">{sample.detail}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

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
                  <p className="font-semibold text-slate-800">{review.name}</p>
                  {review.location && <p className="text-xs text-slate-400">{review.location}</p>}
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

export function DprSuccessSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {DPR_SUCCESS_STORIES.map((story) => (
          <GlassCard key={story.title} className="p-6">
            <h3 className="font-bold text-slate-800">{story.title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{story.detail}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

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

  return (
    <SectionShell section={section} id="faq" altBg>
      <SectionBanners banners={banners} />
      <div className="max-w-3xl mx-auto space-y-3">
        {activeFaqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const panelId = `dpr-faq-panel-${idx}`;
          const buttonId = `dpr-faq-button-${idx}`;
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

export function DprCtaSection({
  section,
  ctx,
  banners,
}: {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
}) {
  const ctaLabel = section.ctaLabel || "Apply Now";
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
      <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <a
          href={ctx.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <GlassCard className="p-6 flex items-center gap-4 hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">WhatsApp support</p>
              <p className="text-sm text-slate-500">Scheme-specific guidance</p>
            </div>
          </GlassCard>
        </a>
        <a href={`tel:${ctx.supportPhone}`} className="group">
          <GlassCard className="p-6 flex items-center gap-4 hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 group-hover:text-sky-700 transition-colors">Call an expert</p>
              <p className="text-sm text-slate-500">{ctx.supportPhone}</p>
            </div>
          </GlassCard>
        </a>
      </div>
      <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
        <Mail className="h-3.5 w-3.5" /> Powered by RNOS India Pvt Ltd
      </p>
    </SectionShell>
  );
}
