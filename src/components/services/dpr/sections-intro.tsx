"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Landmark,
  Lock,
  Play,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { DPR_LAUNCH_PRICE } from "@/lib/dpr/constants";
import type { DprBanner, DprSection } from "@/lib/dpr/types";
import {
  CtaButton,
  GlassCard,
  SectionBanners,
  SectionShell,
  WhatsAppIcon,
  type DprSectionContext,
} from "./shared";

type IntroProps = {
  section: DprSection;
  ctx: DprSectionContext;
  banners: DprBanner[];
  launchPrice?: number;
  videoUrl?: string | null;
};

export function DprHeroSection({ section, ctx, banners, launchPrice = DPR_LAUNCH_PRICE }: IntroProps) {
  const ctaLabel = section.ctaLabel || "Apply Now";
  const ctaUrl = section.ctaUrl || ctx.applyUrl;

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
                Bank-ready DPR for PMEGP, Mudra & MSME schemes
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-slate-900 tracking-tight leading-[1.08]">
                {section.heading || "Detailed Project Report"}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-sky-600 to-emerald-600 mt-1">
                  Launch offer ₹{launchPrice}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                {section.description}
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
                  <span className="text-3xl font-heading font-bold text-slate-900">₹{launchPrice}</span>
                  <span className="text-slate-400 line-through text-sm">₹999</span>
                  <span className="text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    Launch offer
                  </span>
                </div>
                <p className="text-xs text-slate-400">Scheme-aligned DPR with portal tracking</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="flex flex-wrap gap-4"
            >
              <CtaButton href={ctaUrl} label={ctaLabel} />
              <a
                href={ctx.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 md:h-12 items-center justify-center gap-2 px-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all text-[15px]"
              >
                <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                Talk to Expert
              </a>
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
                    DPR
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loan-ready</p>
                    <p className="text-xs font-bold text-slate-700">Project Report Draft</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100/60">
                  In review
                </span>
              </div>

              <div className="my-auto space-y-4 relative z-10">
                {[
                  { icon: FileText, title: "Cost & means of finance", sub: "Bank-standard structure", color: "sky" },
                  { icon: TrendingUp, title: "3-year projections", sub: "Sales & repayment view", color: "emerald" },
                  { icon: CheckCircle, title: "Scheme annexures", sub: "PMEGP / Mudra aligned", color: "sky" },
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

export function DprTrustSection({ section }: { section: DprSection }) {
  const items = [
    { icon: Landmark, label: "Scheme-aware drafting" },
    { icon: UserCheck, label: "Expert document review" },
    { icon: Shield, label: "Secure uploads & payments" },
    { icon: Clock, label: "Fast 24–72h turnaround" },
    { icon: Building2, label: "PAN India partner network" },
    { icon: Sparkles, label: "Transparent launch pricing" },
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

export function DprWhatIsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  const points = [
    "Formal project document required by banks and departments",
    "Covers cost of project, means of finance, and projections",
    "Scheme-specific annexures for subsidy-linked loans",
    "Improves appraisal clarity and reduces rework cycles",
  ];

  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <GlassCard className="p-6 md:p-8 space-y-4">
          <p className="text-slate-600 leading-relaxed">
            A Detailed Project Report (DPR) is the structured business case lenders review before approving
            PMEGP, Mudra, CM Yuva, and other MSME-linked credit files. It translates your idea into bank-ready
            numbers, machinery schedules, and repayment capacity.
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

export function DprVideoSection({
  section,
  ctx,
  banners,
  videoUrl,
}: IntroProps) {
  const embedUrl = videoUrl ? toEmbedUrl(videoUrl) : null;

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="max-w-4xl mx-auto">
        {embedUrl ? (
          <GlassCard className="overflow-hidden aspect-video">
            <iframe
              src={embedUrl}
              title={section.heading || "DPR process video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </GlassCard>
        ) : (
          <GlassCard className="aspect-video flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Play className="h-7 w-7 ml-1" />
            </div>
            <p className="text-slate-500 max-w-md">
              Video overview coming soon. Meanwhile, chat with our team on WhatsApp for a walkthrough.
            </p>
            <Link
              href={ctx.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:text-sky-700"
            >
              Request a demo <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassCard>
        )}
      </div>
    </SectionShell>
  );
}

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return url;
  } catch {
    return null;
  }
}
