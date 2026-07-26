"use client";

import {
  BadgeCheck,
  BarChart3,
  CheckCircle,
  ClipboardList,
  FileCheck2,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  DPR_BENEFITS,
  DPR_DOCUMENTS,
  DPR_INCLUDES,
  DPR_SCHEMES,
  DPR_STATS,
  DPR_TRUST_BADGES,
  DPR_WHY_US,
} from "@/lib/dpr/defaults";
import type { DprBanner, DprSection } from "@/lib/dpr/types";
import { Counter, GlassCard, SectionBanners, SectionShell } from "./shared";

const whyIcons = [Sparkles, FileCheck2, BadgeCheck, ShieldCheck];

export function DprWhyUsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {DPR_WHY_US.map((item, idx) => {
          const Icon = whyIcons[idx % whyIcons.length];
          return (
            <GlassCard key={item.title} className="p-6 group hover:shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-shadow">
              <div className="h-11 w-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.detail}</p>
            </GlassCard>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function DprSchemesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DPR_SCHEMES.map((scheme) => (
          <GlassCard key={scheme.name} className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                {scheme.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{scheme.name}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{scheme.blurb}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprIncludesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {DPR_INCLUDES.map((item) => (
          <GlassCard key={item.title} className="p-5 flex gap-3">
            <Layers className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-800">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.detail}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprBenefitsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {DPR_BENEFITS.map((benefit) => (
          <GlassCard key={benefit} className="p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">{benefit}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprDocumentsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
        {DPR_DOCUMENTS.map((doc) => (
          <GlassCard key={doc} className="p-4 flex items-center gap-3">
            <ClipboardList className="h-4.5 w-4.5 text-sky-600 shrink-0" />
            <span className="text-sm font-medium text-slate-700">{doc}</span>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprStatsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {DPR_STATS.map((stat) => (
          <GlassCard key={stat.label} className="p-6 text-center">
            <div className="text-3xl md:text-4xl text-slate-900">
              <Counter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                decimals={stat.label === "Customer rating" ? 1 : 0}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{stat.label}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function DprTrustBadgesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
        {DPR_TRUST_BADGES.map((badge) => (
          <span
            key={badge}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 bg-white/80 text-sm font-medium text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
          >
            <BarChart3 className="h-4 w-4 text-sky-600" />
            {badge}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
