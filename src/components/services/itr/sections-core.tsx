"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle,
  ClipboardList,
  FileCheck2,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  ITR_BENEFITS,
  ITR_INCOME_SOURCES,
  ITR_MISTAKES,
  ITR_PROCESS_STEPS,
  ITR_TRUST_POINTS,
  ITR_WHO_SHOULD_FILE,
  ITR_WHY_US,
} from "@/lib/itr/defaults";
import type { ItrBanner, ItrComparisonRow, ItrDocumentItem, ItrSection } from "@/lib/itr/types";
import { DisclaimerText, GlassCard, SectionBanners, SectionShell, type ItrSectionContext } from "./shared";

const whyIcons = [Sparkles, FileCheck2, BadgeCheck, ShieldCheck];

export function ItrWhoShouldFileSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
        {ITR_WHO_SHOULD_FILE.map((item) => (
          <GlassCard key={item} className="p-4 flex items-start gap-3">
            <Users className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">{item}</p>
          </GlassCard>
        ))}
      </div>
      <DisclaimerText text="Educational guide — final applicability depends on income, thresholds and current law." />
    </SectionShell>
  );
}

export function ItrIncomeSourcesSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="flex flex-wrap justify-center gap-2 max-w-5xl mx-auto">
        {ITR_INCOME_SOURCES.map((source) => (
          <span
            key={source.id}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 bg-white/80 text-sm font-medium text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
          >
            <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
            {source.label}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}

export function ItrFormComparisonSection({
  section,
  banners,
  rows,
  ctx,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  rows: ItrComparisonRow[];
  ctx: ItrSectionContext;
}) {
  const activeRows = rows.filter((r) => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="overflow-x-auto rounded-[22px] border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left p-4 font-semibold text-slate-700">Form</th>
              <th className="text-left p-4 font-semibold text-slate-700">Typical taxpayer</th>
              <th className="text-left p-4 font-semibold text-slate-700">Common sources</th>
              <th className="text-left p-4 font-semibold text-slate-700">Complexity</th>
              <th className="text-left p-4 font-semibold text-sky-700">Suggested package</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <tr key={row.feature} className="border-t border-slate-100">
                <td className="p-4 font-medium text-slate-800">
                  {row.formCode || row.feature}
                </td>
                <td className="p-4 text-slate-600">{row.typicalTaxpayer}</td>
                <td className="p-4 text-slate-600">{row.commonSources}</td>
                <td className="p-4 text-slate-600">{row.complexity}</td>
                <td className="p-4 text-emerald-700 font-medium">{row.suggestedPackage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DisclaimerText text={ctx.finalQuoteDisclaimer} />
    </SectionShell>
  );
}

export function ItrBenefitsSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {ITR_BENEFITS.map((benefit) => (
          <GlassCard key={benefit} className="p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">{benefit}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function ItrDocumentsSection({
  section,
  banners,
  documents,
}: {
  section: ItrSection;
  banners: ItrBanner[];
  documents: ItrDocumentItem[];
}) {
  const activeDocs = documents.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = Array.from(
    new Map(activeDocs.map((d) => [d.categoryKey, d.categoryLabel])).entries(),
  );

  return (
    <SectionShell section={section} id="documents">
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {categories.map(([key, label]) => {
          const items = activeDocs.filter((d) => d.categoryKey === key);
          return (
            <GlassCard key={key} className="p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-sky-600" />
                {label}
              </h3>
              <ul className="space-y-2.5">
                {items.map((doc) => (
                  <li key={doc.documentKey} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${doc.requiredDefault ? "text-emerald-500" : "text-slate-300"}`}
                    />
                    <span>
                      {doc.documentLabel}
                      {doc.requiredDefault && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function ItrProcessSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {ITR_PROCESS_STEPS.map((step) => (
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

export function ItrWhyUsSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ITR_WHY_US.map((item, idx) => {
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

export function ItrMistakesSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section} altBg>
      <SectionBanners banners={banners} />
      <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
        {ITR_MISTAKES.map((mistake) => (
          <GlassCard key={mistake} className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">{mistake}</p>
          </GlassCard>
        ))}
      </div>
    </SectionShell>
  );
}

export function ItrTrustUsSection({ section, banners }: { section: ItrSection; banners: ItrBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
        {ITR_TRUST_POINTS.map((point) => (
          <span
            key={point}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 bg-white/80 text-sm font-medium text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
          >
            <Layers className="h-4 w-4 text-sky-600" />
            {point}
          </span>
        ))}
      </div>
      <DisclaimerText text="DigiConnect Dukan is not affiliated with or endorsed by the Income Tax Department or any government body." />
    </SectionShell>
  );
}
