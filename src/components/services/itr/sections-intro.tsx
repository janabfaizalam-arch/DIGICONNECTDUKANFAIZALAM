"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Receipt,
  Shield,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type { ItrBanner, ItrPageSettings, ItrSection } from "@/lib/itr/types";
import {
  CtaButton,
  GlassCard,
  SectionBanners,
  SectionShell,
  WhatsAppIcon,
  type ItrSectionContext,
} from "./shared";

type HeroProps = {
  section: ItrSection;
  ctx: ItrSectionContext;
  banners: ItrBanner[];
  settings: ItrPageSettings;
};

export function ItrHeroSection({ section, ctx, banners, settings }: HeroProps) {
  const ctaLabel = section.ctaLabel || settings.primaryCtaLabel || "Apply Now";
  const ctaUrl = section.ctaUrl || ctx.applyUrl;
  const supportLabel = settings.supportCtaLabel || "Check Required Documents";
  const supportUrl = settings.supportCtaUrl || "#documents";

  return (
    <section id="hero" className="relative pt-28 pb-20 md:pt-36 md:pb-28 bg-gradient-to-b from-slate-50/70 to-white overflow-hidden">
      <div className="absolute top-1/4 left-[8%] w-80 h-80 bg-sky-100/35 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/3 right-[8%] w-80 h-80 bg-emerald-100/25 rounded-full blur-3xl translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        <SectionBanners banners={banners} lazy={false} />

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-100 bg-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-medium text-slate-600 tracking-wide">
                {settings.filingOpenNotice || ctx.assessmentYear}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-slate-900 tracking-tight leading-[1.08]">
                {section.heading || settings.heroHeading || "Income Tax Return Filing"}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 mt-1">
                  from ₹{ctx.startingPrice.toLocaleString("en-IN")}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                {section.description || settings.heroDescription}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="flex flex-wrap items-center gap-4 bg-white/70 p-4 rounded-[22px] border border-slate-100 max-w-lg shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-heading font-bold text-slate-900">
                    ₹{ctx.startingPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    Starting price
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {ctx.assessmentYear}
                  {settings.estimatedTurnaround ? ` · ${settings.estimatedTurnaround}` : ""}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="flex flex-wrap gap-4"
            >
              <CtaButton href={ctaUrl} label={ctaLabel} />
              {settings.secondaryCtaLabel && settings.secondaryCtaUrl ? (
                <a
                  href={settings.secondaryCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 md:h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all text-[15px]"
                >
                  <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                  {settings.secondaryCtaLabel}
                </a>
              ) : (
                <a
                  href={ctx.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 md:h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all text-[15px]"
                >
                  <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                  Talk to Expert
                </a>
              )}
              {supportLabel && (
                <CtaButton href={supportUrl} label={supportLabel} variant="secondary" />
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-5 relative mt-4 lg:mt-0 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative w-full max-w-[420px] aspect-[4/5] bg-gradient-to-tr from-slate-50 to-white rounded-[28px] border border-slate-100 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-100/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-emerald-100/25 rounded-full blur-2xl" />

              <div className="flex justify-between items-center border-b border-slate-100/80 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                    ITR
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expert-assisted</p>
                    <p className="text-xs font-bold text-slate-700">{ctx.assessmentYear}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100/60">
                  In review
                </span>
              </div>

              <div className="my-auto space-y-4 relative z-10">
                {[
                  { icon: FileText, title: "Form selection", sub: "After document review", color: "sky" },
                  { icon: Receipt, title: "Income mapping", sub: "Salary, CG, business & more", color: "emerald" },
                  { icon: CheckCircle, title: "Acknowledgement", sub: "Portal delivery", color: "sky" },
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    animate={ctx.reduceMotion ? undefined : { y: [0, idx % 2 === 0 ? -3 : 3, 0] }}
                    transition={ctx.reduceMotion ? undefined : { repeat: Infinity, duration: 4 + idx, ease: "easeInOut" }}
                    className="flex items-center justify-between p-3.5 bg-white rounded-[18px] border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl border ${
                          item.color === "emerald"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/60"
                            : "bg-sky-50 text-sky-600 border-sky-100/60"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                        <p className="text-[10px] text-slate-400">{item.sub}</p>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-100/80 pt-4 relative z-10">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Secure document handling
                </span>
                <span className="font-semibold text-slate-600">DigiConnect Dukan</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ItrTrustSection({ section }: { section: ItrSection }) {
  const items = [
    { icon: Shield, label: "Expert-assisted filing" },
    { icon: UserCheck, label: "Document review before submit" },
    { icon: Lock, label: "Secure uploads & payments" },
    { icon: Clock, label: "Online status tracking" },
    { icon: Sparkles, label: "Transparent starting prices" },
    { icon: Receipt, label: "Digital invoice & portal access" },
  ];

  return (
    <section id="trust" className="py-6 border-y border-slate-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        {(section.heading || section.description) && (
          <p className="text-center text-sm text-slate-500 mb-5 md:mb-0 md:hidden">{section.heading}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-y-5 gap-x-6">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-slate-500 text-sm">
              <item.icon className="h-4 w-4 text-sky-600 shrink-0" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ItrWhatIsSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  const points = [
    "Official statement of income, deductions, and tax for a financial year",
    "Required for compliance when thresholds or conditions apply",
    "Supports refund claims where eligible under applicable law",
    "Useful documentation for loans, visas, and income proof requests",
  ];

  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <GlassCard className="p-6 md:p-8 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            An Income Tax Return (ITR) is the form you file with the Income Tax Department summarising
            your income, deductions, and tax liability for a financial year. DigiConnect Dukan provides
            expert-assisted filing with document review, transparent packages, and portal tracking.
          </p>
        </GlassCard>
        <div className="grid gap-3">
          {points.map((point) => (
            <GlassCard key={point} className="p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">{point}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
