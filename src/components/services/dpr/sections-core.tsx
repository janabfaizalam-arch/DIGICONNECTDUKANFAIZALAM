"use client";

import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  Layers,
  LineChart,
  Lock,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
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
import { Counter, DprIcon, GlassCard, SectionBanners, SectionShell } from "./shared";

/* Icon per entry, in the order the defaults declare them. Anything an admin
   adds beyond the list falls back to the first icon rather than breaking. */
const WHY_ICONS = [Sparkles, FileCheck2, BadgeCheck, ShieldCheck];
const SCHEME_ICONS = [Landmark, Wallet, Users, Factory, Building2, Banknote];
const INCLUDE_ICONS = [ClipboardList, Banknote, Wallet, Factory, LineChart, Paperclip];
const BADGE_ICONS = [Lock, FileCheck2, ShieldCheck, Building2, BadgeCheck];
const STAT_ICONS = [Wallet, Layers, CalendarClock, FileSpreadsheet];

function pick<T>(list: T[], index: number) {
  return list[index % list.length];
}

/* ─────────────────────────────────────────────────────────────────────────
   Why us
   ───────────────────────────────────────────────────────────────────────── */

export function DprWhyUsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {DPR_WHY_US.map((item, index) => {
          const Icon = pick(WHY_ICONS, index);
          return (
            <li key={item.title}>
              <GlassCard className="h-full p-4 sm:p-5">
                <DprIcon tone={index === 0 ? "flame" : "blue"}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </DprIcon>
                <h3 className="mt-3.5 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                  {item.detail}
                </p>
              </GlassCard>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Schemes
   ───────────────────────────────────────────────────────────────────────── */

export function DprSchemesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} surface="sky">
      <SectionBanners banners={banners} />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {DPR_SCHEMES.map((scheme, index) => {
          const Icon = pick(SCHEME_ICONS, index);
          return (
            <li key={scheme.name}>
              <GlassCard className="h-full p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <DprIcon tone={index % 3 === 0 ? "flame" : "blue"}>
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </DprIcon>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                      {scheme.name}
                    </h3>
                    <p className="mt-1 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                      {scheme.blurb}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   What the report contains
   ───────────────────────────────────────────────────────────────────────── */

export function DprIncludesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {DPR_INCLUDES.map((item, index) => {
          const Icon = pick(INCLUDE_ICONS, index);
          return (
            <li key={item.title}>
              <GlassCard className="relative h-full p-4 sm:p-5">
                {/* The chapter number, set as a watermark rather than a badge:
                    it orders the list without competing with the title. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-2 text-[2.25rem] font-extrabold leading-none text-[var(--dc-blue-bright)]/10"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <DprIcon>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </DprIcon>
                <h3 className="mt-3.5 pr-8 text-[14px] font-extrabold leading-snug text-[var(--dc-ink)] sm:text-[15px]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] font-medium leading-[1.6] text-[var(--dc-body)] sm:text-[13.5px]">
                  {item.detail}
                </p>
              </GlassCard>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Benefits
   ───────────────────────────────────────────────────────────────────────── */

export function DprBenefitsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} surface="sky">
      <SectionBanners banners={banners} />
      <ul className="mx-auto grid max-w-4xl gap-2.5 sm:grid-cols-2 sm:gap-3">
        {DPR_BENEFITS.map((benefit) => (
          <li key={benefit}>
            <GlassCard className="flex h-full items-start gap-2.5 p-3.5 sm:p-4">
              <CheckCircle2
                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--dc-flame)]"
                aria-hidden="true"
              />
              <p className="text-[12.5px] font-semibold leading-[1.55] text-[var(--dc-ink)] sm:text-[13.5px]">
                {benefit}
              </p>
            </GlassCard>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Documents checklist
   ───────────────────────────────────────────────────────────────────────── */

export function DprDocumentsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ul className="mx-auto grid max-w-5xl gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {DPR_DOCUMENTS.map((doc) => (
          <li key={doc}>
            <GlassCard className="flex h-full items-center gap-2.5 p-3.5 sm:p-4">
              <ClipboardList
                className="h-[17px] w-[17px] shrink-0 text-[var(--dc-blue-mid)]"
                aria-hidden="true"
              />
              <span className="text-[12.5px] font-bold leading-snug text-[var(--dc-ink)] sm:text-[13.5px]">
                {doc}
              </span>
            </GlassCard>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[12.5px] font-medium text-[var(--dc-muted)]">
        Missing one? Start anyway — the application saves as you go, and documents can be added before payment.
      </p>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Numbers
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Four figures, each of which is a fact about the service rather than a claim
 * about its popularity. There is deliberately no customer count and no star
 * rating here: neither can be verified from outside, and an unverifiable
 * number on a page selling a loan document costs more trust than it buys.
 */
export function DprStatsSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section}>
      <SectionBanners banners={banners} />
      <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {DPR_STATS.map((stat, index) => {
          const Icon = pick(STAT_ICONS, index);
          return (
            <li key={stat.label}>
              <GlassCard className="h-full p-4 text-center sm:p-5">
                <DprIcon tone={index % 2 === 0 ? "blue" : "flame"} className="mx-auto">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </DprIcon>
                <p className="mt-3 text-[1.5rem] font-extrabold leading-none text-[var(--dc-ink)] sm:text-[2rem]">
                  <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-[var(--dc-body)] sm:text-[12.5px]">
                  {stat.label}
                </p>
              </GlassCard>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trust badges
   ───────────────────────────────────────────────────────────────────────── */

export function DprTrustBadgesSection({ section, banners }: { section: DprSection; banners: DprBanner[] }) {
  return (
    <SectionShell section={section} surface="sky">
      <SectionBanners banners={banners} />
      <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 sm:gap-3">
        {DPR_TRUST_BADGES.map((badge, index) => {
          const Icon = pick(BADGE_ICONS, index);
          return (
            <li key={badge}>
              <span className="lg-pill lg-raise inline-flex min-h-10 items-center gap-2 px-3.5 text-[12px] font-bold text-[var(--dc-ink)] sm:text-[13px]">
                <Icon className="h-4 w-4 shrink-0 text-[var(--dc-flame)]" aria-hidden="true" />
                {badge}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
